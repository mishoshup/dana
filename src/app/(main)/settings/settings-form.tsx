"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface SettingsFormProps {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
  };
}

interface ApiError {
  message?: string;
  error?: string;
}

export default function SettingsForm({ user }: SettingsFormProps) {
  const [name, setName] = useState(user.name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [nameMessage, setNameMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [nameLoading, setNameLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  async function handleNameUpdate(e: React.FormEvent) {
    e.preventDefault();
    setNameMessage(null);
    setNameLoading(true);

    try {
      const res = await fetch("/api/auth/update-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name }),
      });

      const data = (await res.json()) as ApiError;

      if (!res.ok) {
        setNameMessage({ type: "error", text: data.message || data.error || "Failed to update name" });
        return;
      }

      setNameMessage({ type: "success", text: "Name updated successfully" });
    } catch {
      setNameMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setNameLoading(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordMessage(null);

    if (!currentPassword || !newPassword) {
      setPasswordMessage({ type: "error", text: "Both fields are required" });
      return;
    }
    if (newPassword.length < 8) {
      setPasswordMessage({ type: "error", text: "New password must be at least 8 characters" });
      return;
    }

    setPasswordLoading(true);

    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = (await res.json()) as ApiError;

      if (!res.ok) {
        setPasswordMessage({ type: "error", text: data.message || data.error || "Failed to change password" });
        return;
      }

      setPasswordMessage({ type: "success", text: "Password changed successfully" });
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setPasswordMessage({ type: "error", text: "Something went wrong. Please try again." });
    } finally {
      setPasswordLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Profile Section */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Profile</h2>

        <div className="space-y-1">
          <label className="text-sm text-zinc-400">Email</label>
          <p className="text-sm text-zinc-300 bg-zinc-800/50 px-3 py-2 rounded-lg">
            {user.email}
          </p>
        </div>

        <form onSubmit={handleNameUpdate} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="name" className="text-sm text-zinc-400">
              Name
            </Label>
            <Input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          {nameMessage && (
            <p className={`text-sm ${nameMessage.type === "error" ? "text-red-400" : "text-green-400"}`}>
              {nameMessage.text}
            </p>
          )}

          <Button
            type="submit"
            disabled={nameLoading}
          >
            {nameLoading ? "Saving..." : "Save"}
          </Button>
        </form>
      </section>

      {/* Password Section */}
      <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-4">
        <h2 className="text-lg font-semibold text-white">Change Password</h2>

        <form onSubmit={handlePasswordChange} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="currentPassword" className="text-sm text-zinc-400">
              Current Password
            </Label>
            <Input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="newPassword" className="text-sm text-zinc-400">
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          {passwordMessage && (
            <p className={`text-sm ${passwordMessage.type === "error" ? "text-red-400" : "text-green-400"}`}>
              {passwordMessage.text}
            </p>
          )}

          <Button
            type="submit"
            disabled={passwordLoading}
          >
            {passwordLoading ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </section>
    </div>
  );
}
