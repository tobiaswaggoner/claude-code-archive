"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderOpen,
  MessageSquare,
  GitBranch,
  GitCommit,
  Server,
  Settings,
  LogOut,
  Archive,
  AlertTriangle,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/core";
import { ThemeToggle } from "./theme-toggle";

const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE ?? "mock";
const IS_MOCK_MODE = AUTH_MODE !== "backend";

const navItems = {
  archive: [
    { title: "Projects", url: "/projects", icon: FolderOpen },
    { title: "Sessions", url: "/sessions", icon: MessageSquare },
  ],
  git: [
    { title: "Repositories", url: "/repos", icon: GitBranch },
    { title: "Commits", url: "/commits", icon: GitCommit },
  ],
  system: [
    { title: "Collectors", url: "/collectors", icon: Server },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
};

export function AppSidebar() {
  const pathname = usePathname();
  const { session, signOut } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      {/* Header with Logo */}
      <SidebarHeader className="h-14 flex items-center px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Archive className="h-5 w-5 text-primary" />
          <span className="group-data-[collapsible=icon]:hidden">
            Claude Archive
          </span>
        </Link>
      </SidebarHeader>

      <Separator className="mx-2" />

      {/* Navigation */}
      <SidebarContent className="px-2">
        {/* Archive Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Archive</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.archive.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Git Section */}
        <SidebarGroup>
          <SidebarGroupLabel>Git</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.git.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* System Section */}
        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.system.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.url}
                    tooltip={item.title}
                  >
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer with Theme Toggle and User Menu */}
      <SidebarFooter className="p-2">
        <Separator className="mb-2" />

        {/* Mock Mode Warning */}
        {IS_MOCK_MODE && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 mb-2 px-2 py-1.5 rounded-md bg-orange-500/10 text-orange-500 text-xs font-medium group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-1">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span className="group-data-[collapsible=icon]:hidden">
                  Mock Mode
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Using mock authentication</p>
              <p className="text-muted-foreground">Set NEXT_PUBLIC_AUTH_MODE=backend to connect</p>
            </TooltipContent>
          </Tooltip>
        )}

        <div className="flex items-center justify-between mb-2 group-data-[collapsible=icon]:justify-center">
          <ThemeToggle />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="w-full justify-start"
              tooltip={session?.user.email ?? "User"}
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                  {session?.user.name?.[0]?.toUpperCase() ?? "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start group-data-[collapsible=icon]:hidden">
                <span className="text-sm font-medium">
                  {session?.user.name ?? "User"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {session?.user.email}
                </span>
              </div>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
