import * as React from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = React.useState(false)
    const [isCollapsed, setIsCollapsed] = React.useState(false)

    return (
        <div className="flex h-screen overflow-hidden bg-[#F8FAFC]">
            {/* Sidebar - Desktop: Fixed width container, Mobile: Absolute */}
            <div className={`transition-all duration-300 ease-in-out hidden lg:block grow-0 shrink-0 ${isCollapsed ? 'w-20' : 'w-72'}`}>
                <Sidebar
                    open={sidebarOpen}
                    setOpen={setSidebarOpen}
                    isCollapsed={isCollapsed}
                    setIsCollapsed={setIsCollapsed}
                />
            </div>

            {/* Mobile Sidebar (Fixed) */}
            <div className="lg:hidden">
                <Sidebar
                    open={sidebarOpen}
                    setOpen={setSidebarOpen}
                    isCollapsed={false}
                    setIsCollapsed={() => { }}
                />
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
                <Header setSidebarOpen={setSidebarOpen} />

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 custom-scrollbar">
                    <div className="max-w-[1400px] mx-auto pb-10">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
