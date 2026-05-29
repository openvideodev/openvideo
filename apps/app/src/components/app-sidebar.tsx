"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Icons } from "./shared/icons";
import { Button } from "./ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LogOut,
  Moon,
  Sun,
  Folder,
  Users,
  Play,
  Trash2,
  Bell,
  ChevronDown,
  ChevronsUpDownIcon,
  PlusIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter, usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useMemo, useState } from "react";

export function AppSidebar() {
  const { openMobile, isMobile, setOpenMobile } = useSidebar();
  const { data: session } = authClient.useSession();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  const handleMobileClose = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const navItems = [
    { id: "my-files", label: "My Files", icon: Folder, href: "/projects" },
    { id: "shared", label: "Shared with me", icon: Users, href: "/shared" },
    { id: "apps", label: "Apps", icon: Play, href: "/apps" },
    { id: "trash", label: "Trash", icon: Trash2, href: "/trash" },
  ];
  console.log({ session });

  return (
    <>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    size="lg"
                    className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                  >
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage
                        src={session?.user?.image || ""}
                        alt={session?.user?.name || ""}
                      />
                      <AvatarFallback className="rounded-lg bg-orange-300 text-primary-foreground">
                        {session?.user?.name?.charAt(0).toUpperCase() ||
                          session?.user?.email?.charAt(0).toUpperCase() ||
                          "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">
                        {session?.user?.name || "User"}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {session?.user?.email}
                      </span>
                    </div>
                    <ChevronsUpDownIcon className="ml-auto" />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56"
                  side={isMobile ? "bottom" : "right"}
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                      <Link href="/account" onClick={handleMobileClose}>
                        Settings
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/billing" onClick={handleMobileClose}>
                        Subscription
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                      <span>Theme</span>
                      {theme === "dark" ? (
                        <Moon className="ml-auto size-4" />
                      ) : (
                        <Sun className="ml-auto size-4" />
                      )}
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>

          <Button
            onClick={() => {
              setIsCreateModalOpen(true);
              handleMobileClose();
            }}
            className="w-full my-0.5"
          >
            <PlusIcon className="mr-2" />
            Create New File
          </Button>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
                  const Icon = item.icon;
                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton className="px-4" isActive={isActive} asChild>
                        <Link href={item.href} onClick={handleMobileClose}>
                          <Icon />
                          <span>{item.label}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="mb-4">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <Popover>
                <PopoverTrigger asChild>
                  <SidebarMenuButton className="px-4" tooltip="Notifications">
                    <Bell />

                    <span>Notifications</span>
                  </SidebarMenuButton>
                </PopoverTrigger>
                <PopoverContent className="w-80 space-y-4">
                  <div>
                    <p className="text-sm font-semibold">Notifications</p>
                  </div>
                </PopoverContent>
              </Popover>
            </SidebarMenuItem>

            <SidebarMenuItem>
              <SidebarMenuButton className="px-4" asChild tooltip="Discord">
                <Link
                  href="https://discord.gg/Tw6GnPqKJ4"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleMobileClose}
                >
                  <Icons.discord />
                  <span>Discord</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
    </>
  );
}
