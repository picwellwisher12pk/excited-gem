import { Dropdown, MenuProps, Badge, message } from 'antd'
import { MoreHorizontal, Copy, RefreshCw, Layers, FileText } from 'lucide-react'
import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import Btn from '~/components/Btn'
import { DuplicateTabsModal } from '~/components/Modals/DuplicateTabsModal'

const MoreActionsMenu = () => {
    const { tabs } = useSelector((state: any) => state.tabs)
    const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
    const [isGrouping, setIsGrouping] = useState(false)

    const duplicateCount = useMemo(() => {
        const urlCounts: Record<string, number> = {}
        tabs.forEach((tab: any) => {
            urlCounts[tab.url] = (urlCounts[tab.url] || 0) + 1
        })
        return Object.values(urlCounts).reduce((acc, count) => acc + (count > 1 ? count : 0), 0)
    }, [tabs])

    const handleGroupByDomain = async () => {
        if (!chrome.tabs?.group || isGrouping) return
        try {
            setIsGrouping(true)
            const windowsGroup: Record<number, Record<string, number[]>> = {}
            tabs.forEach((tab: any) => {
                try {
                    if (!tab.url) return
                    const domain = new URL(tab.url).hostname.replace(/^www\./, '')
                    if (!domain || domain.startsWith('chrome')) return
                    if (!windowsGroup[tab.windowId]) windowsGroup[tab.windowId] = {}
                    if (!windowsGroup[tab.windowId][domain]) windowsGroup[tab.windowId][domain] = []
                    windowsGroup[tab.windowId][domain].push(tab.id)
                } catch {
                    // ignore invalid URLs
                }
            })

            const colors: Array<'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange'> = [
                'blue', 'green', 'purple', 'orange', 'cyan', 'pink', 'yellow', 'red'
            ]
            let colorIdx = 0
            let groupedCount = 0

            for (const winId of Object.keys(windowsGroup)) {
                const domainMap = windowsGroup[Number(winId)]
                for (const [domain, tabIds] of Object.entries(domainMap)) {
                    if (tabIds.length > 1) {
                        // @ts-ignore
                        const groupId = await chrome.tabs.group({ tabIds })
                        if (groupId && chrome.tabGroups?.update) {
                            await chrome.tabGroups.update(groupId, {
                                title: domain,
                                color: colors[colorIdx % colors.length]
                            })
                            colorIdx++
                            groupedCount += tabIds.length
                        }
                    }
                }
            }

            if (groupedCount > 0) {
                message.success(`Grouped ${groupedCount} tabs by domain`)
            } else {
                message.info('No domain groups with 2+ tabs found')
            }
        } catch (err) {
            console.error('Failed to group tabs by domain:', err)
            message.error('Failed to group tabs by domain')
        } finally {
            setIsGrouping(false)
        }
    }

    const handleExportMarkdown = () => {
        const md = tabs
            .filter((t: any) => t.url && t.title)
            .map((t: any) => `- [${t.title.replace(/[\[\]]/g, '')}](${t.url})`)
            .join('\n')
        navigator.clipboard.writeText(md)
        message.success(`Copied ${tabs.length} tabs as Markdown links`)
    }

    const items: MenuProps['items'] = [
        {
            key: 'highlight-duplicates',
            label: `Manage Duplicates (${duplicateCount})`,
            icon: <Copy size={14} />,
            onClick: () => setIsDuplicateModalOpen(true),
            disabled: duplicateCount === 0,
        },
        {
            key: 'group-by-domain',
            label: isGrouping ? 'Grouping tabs...' : 'Auto-Group by Domain',
            icon: <Layers size={14} />,
            disabled: isGrouping,
            onClick: handleGroupByDomain,
        },
        {
            key: 'export-markdown',
            label: 'Export Tabs to Markdown',
            icon: <FileText size={14} />,
            onClick: handleExportMarkdown,
        },
        {
            type: 'divider',
        },
        {
            key: 'force-refresh',
            label: 'Force refresh tabs view',
            icon: <RefreshCw size={14} />,
            onClick: () => window.location.reload(),
        },
    ]

    return (
        <>
            <Dropdown menu={{ items }} trigger={['click']}>
                <Btn className="flex items-center justify-center px-2" title="More Actions">
                    <Badge count={duplicateCount} size="small" offset={[0, -5]}>
                        <MoreHorizontal size={16} />
                    </Badge>
                </Btn>
            </Dropdown>

            <DuplicateTabsModal
                visible={isDuplicateModalOpen}
                onClose={() => setIsDuplicateModalOpen(false)}
            />
        </>
    )
}

export default MoreActionsMenu
