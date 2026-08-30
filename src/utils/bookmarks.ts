/**
 * Utility functions for interacting with the Browser Bookmarks API.
 * This file provides Promise-based wrappers around the callback-based chrome.bookmarks API.
 */

// Basic Type Definitions based on Browser bookmarks.BookmarkTreeNode
export interface BookmarkNode {
  id: string
  parentId?: string
  index?: number
  url?: string
  title: string
  dateAdded?: number
  dateGroupModified?: number
  unmodifiable?: string
  children?: BookmarkNode[]
}

export const getTree = (): Promise<BookmarkNode[]> => {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((results) => resolve(results as BookmarkNode[]))
  })
}

export const getSubTree = (id: string): Promise<BookmarkNode[]> => {
  return new Promise((resolve) => {
    chrome.bookmarks.getSubTree(id, (results) =>
      resolve(results as BookmarkNode[])
    )
  })
}

export const searchBookmarks = (query: string): Promise<BookmarkNode[]> => {
  return new Promise((resolve) => {
    chrome.bookmarks.search(query, (results) =>
      resolve(results as BookmarkNode[])
    )
  })
}

export const createBookmark = (
  bookmark: chrome.bookmarks.BookmarkCreateArg
): Promise<BookmarkNode> => {
  return new Promise((resolve) => {
    chrome.bookmarks.create(bookmark, (result) =>
      resolve(result as BookmarkNode)
    )
  })
}

export const updateBookmark = (
  id: string,
  changes: chrome.bookmarks.BookmarkChangesArg
): Promise<BookmarkNode> => {
  return new Promise((resolve) => {
    chrome.bookmarks.update(id, changes, (result) =>
      resolve(result as BookmarkNode)
    )
  })
}

export const moveBookmark = (
  id: string,
  destination: chrome.bookmarks.BookmarkDestinationArg
): Promise<BookmarkNode> => {
  return new Promise((resolve) => {
    chrome.bookmarks.move(id, destination, (result) =>
      resolve(result as BookmarkNode)
    )
  })
}

export const removeBookmark = (id: string): Promise<void> => {
  return new Promise((resolve) => {
    chrome.bookmarks.remove(id, () => resolve())
  })
}

export const removeBookmarkTree = (id: string): Promise<void> => {
  return new Promise((resolve) => {
    chrome.bookmarks.removeTree(id, () => resolve())
  })
}

// --- Export / Import Helpers ---

export const exportBookmarks = async (): Promise<string> => {
  const tree = await getTree()
  return JSON.stringify(tree, null, 2)
}

/**
 * Note: Restoring bookmarks is complex because simply recreating them will generate new IDs,
 * potentially duplicating existing ones unless the existing ones are cleared first.
 * The implementation below is a naive approach that assumes we are appending
 * or that the user has cleared their bookmarks.
 */
export const restoreBookmarks = async (jsonString: string): Promise<void> => {
  try {
    const importedTree = JSON.parse(jsonString) as BookmarkNode[]
    // Real-world implementation might need to handle matching existing nodes,
    // avoiding duplication, or specifically importing into a "Restored Bookmarks" folder.

    // For now, let's just log it to satisfy basic requirements, as fully automating
    // a destructive restore operation requires careful UI prompting first.
    console.log('Parsed JSON tree for restore:', importedTree)

    // Recursive function to create bookmarks
    const createNodes = async (nodes: BookmarkNode[], parentId?: string) => {
      for (const node of nodes) {
        // Skip root nodes which are usually unmodifiable ('0', '1', '2')
        if (node.unmodifiable) {
          if (node.children) {
            await createNodes(node.children, node.id)
          }
          continue
        }

        const createdNode = await createBookmark({
          parentId: parentId || node.parentId,
          title: node.title,
          url: node.url
        })

        if (node.children && node.children.length > 0) {
          await createNodes(node.children, createdNode.id)
        }
      }
    }

    if (importedTree && importedTree.length > 0) {
      // Start recreating from the root's children, not the root itself.
      // Usually, the first level is a single root node "0".
      const rootNode = importedTree[0]
      if (rootNode.children) {
        await createNodes(rootNode.children, rootNode.id)
      }
    }
  } catch (error) {
    console.error('Failed to parse bookmark JSON during restore:', error)
    throw error
  }
}

export const findDuplicates = (
  nodes: BookmarkNode[]
): Record<string, BookmarkNode[]> => {
  const urlMap: Record<string, BookmarkNode[]> = {}

  const scanNodes = (currentNodes: BookmarkNode[]) => {
    for (const node of currentNodes) {
      if (node.url) {
        if (!urlMap[node.url]) {
          urlMap[node.url] = []
        }
        urlMap[node.url].push(node)
      }
      if (node.children && node.children.length > 0) {
        scanNodes(node.children)
      }
    }
  }

  scanNodes(nodes)

  // Filter the map to only keep entries with > 1 node
  const duplicates: Record<string, BookmarkNode[]> = {}
  for (const [url, mappedNodes] of Object.entries(urlMap)) {
    if (mappedNodes.length > 1) {
      duplicates[url] = mappedNodes
    }
  }

  return duplicates
}

export const moveBookmarks = async (
  ids: string[],
  targetParentId: string
): Promise<void> => {
  for (const id of ids) {
    await moveBookmark(id, { parentId: targetParentId })
  }
}

export const copyBookmarks = async (
  nodes: BookmarkNode[],
  targetParentId: string
): Promise<void> => {
  for (const node of nodes) {
    const created = await createBookmark({
      parentId: targetParentId,
      title: node.title,
      url: node.url
    })

    if (node.children && node.children.length > 0) {
      await copyBookmarks(node.children, created.id)
    }
  }
}
