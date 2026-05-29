"use client";

import React from "react";
import { authClient } from "@/lib/auth-client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User, Settings } from "lucide-react";

export function UserMenu() {
  const { data: session } = authClient.useSession();
  const router = useRouter();

  if (!session) {
    return (
      <Button
        asChild
        size="lg"
        className="rounded-full px-6 font-semibold shadow-md hover:shadow-lg transition-all duration-200"
      >
        <Link href="/signin">Sign in</Link>
      </Button>
    );
  }

  const { user } = session;

  const handleSignOut = async () => {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/");
          router.refresh();
        },
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-10 w-10 rounded-full p-0 flex items-center justify-center outline-none hover:bg-accent/50 transition-colors"
        >
          <Avatar className="h-9 w-9 border-2 border-primary/20">
            <AvatarImage src={user.image || ""} alt={user.name || "User"} />
            <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
              {user.name?.charAt(0).toUpperCase() || <User className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" forceMount>
        <DropdownMenuLabel className="font-normal p-4">
          <div className="flex flex-col space-y-2">
            <p className="text-sm font-semibold leading-none">{user.name}</p>
            <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer p-3">
          <Link href="/home" className="flex items-center">
            <User className="mr-3 h-4 w-4" />
            <div className="flex flex-col">
              <span className="font-medium">My Projects</span>
              <span className="text-xs text-muted-foreground">Manage your videos</span>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer p-3">
          <Link href="/settings" className="flex items-center">
            <Settings className="mr-3 h-4 w-4" />
            <div className="flex flex-col">
              <span className="font-medium">Account Settings</span>
              <span className="text-xs text-muted-foreground">Profile & preferences</span>
            </div>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer p-3"
          onClick={handleSignOut}
        >
          <LogOut className="mr-3 h-4 w-4" />
          <span className="font-medium">Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
