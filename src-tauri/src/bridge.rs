use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::net::{TcpListener, TcpStream};
use tokio::sync::{mpsc, Mutex};
use tokio_tungstenite::tungstenite::Message;

type Tx = mpsc::UnboundedSender<Message>;
type PeerMap = Arc<Mutex<HashMap<String, Tx>>>;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BridgeMessage {
    pub r#type: String,
    #[serde(default)]
    pub browser_id: Option<String>,
    #[serde(default)]
    pub payload: Option<serde_json::Value>,
}

pub struct BridgeServer {
    peers: PeerMap,
}

impl BridgeServer {
    pub fn new() -> Self {
        Self {
            peers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn start(&self, port: u16) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let addr = format!("127.0.0.1:{}", port);
        let listener = TcpListener::bind(&addr).await?;
        log::info!("Excited Gem Bridge Server listening on: {}", addr);

        let peers = self.peers.clone();

        tokio::spawn(async move {
            while let Ok((stream, _)) = listener.accept().await {
                let peers_inner = peers.clone();
                tokio::spawn(handle_connection(peers_inner, stream));
            }
        });

        Ok(())
    }
}

async fn handle_connection(peers: PeerMap, stream: TcpStream) {
    let ws_stream = match tokio_tungstenite::accept_async(stream).await {
        Ok(ws) => ws,
        Err(e) => {
            log::error!("Error during WebSocket handshake: {}", e);
            return;
        }
    };

    let (mut ws_sender, mut ws_receiver) = ws_stream.split();
    let (tx, mut rx) = mpsc::unbounded_channel();

    let client_id = format!("peer_{}", uuid_v4_simple());

    {
        let mut p = peers.lock().await;
        p.insert(client_id.clone(), tx);
    }

    // Spawn forwarding task
    let forward_task = tokio::spawn(async move {
        while let Some(message) = rx.recv().await {
            if ws_sender.send(message).await.is_err() {
                break;
            }
        }
    });

    let peers_read = peers.clone();
    let current_id = client_id.clone();

    while let Some(msg) = ws_receiver.next().await {
        match msg {
            Ok(Message::Text(text)) => {
                // Broadcast to all other peers
                let p = peers_read.lock().await;
                for (id, peer_tx) in p.iter() {
                    if id != &current_id {
                        let _ = peer_tx.send(Message::Text(text.clone()));
                    }
                }
            }
            Ok(Message::Close(_)) => break,
            Err(_) => break,
            _ => {}
        }
    }

    // Cleanup on disconnect
    {
        let mut p = peers.lock().await;
        p.remove(&client_id);
    }
    forward_task.abort();
}

fn uuid_v4_simple() -> u128 {
    use std::time::{SystemTime, UNIX_EPOCH};
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos()
}
