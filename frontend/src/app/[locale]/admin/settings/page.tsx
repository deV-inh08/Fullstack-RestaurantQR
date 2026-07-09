"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { AdminHeader } from "@/src/components/admin/admin-header"
import { Button } from "@/src/components/ui/button"
import {
  Form,
  FormField,
  FormItem,
  FormMessage,
} from "@/src/components/ui/form"
import { Eye, EyeOff, Camera } from "lucide-react"
import { ChangePasswordBody, ChangePasswordBodyType } from "@/src/schema/account.schema"
import { useChangePasswordMutation, useGetMe, useUpdateMeMutation } from "@/src/queries/useAccount"
import { handleErrorApi } from "@/src/lib/utils"
import { useAppProviderStore } from "@/src/components/app-provider"
import { useRouter } from "@/src/i18n/navigation"
import authApiRequest from "@/src/apiRequests/auth.request"

export default function SettingsPage() {
  const t = useTranslations("Admin.Settings")
  const router = useRouter()
  const setRole = useAppProviderStore((state) => state.setRole)

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isHoveringAvatar, setIsHoveringAvatar] = useState(false)

  // ─── Fetch current user ──────────────────────────────────────────────────────
  const { data: meData } = useGetMe()
  const me = meData?.payload.data

  // ─── Update profile mutation ─────────────────────────────────────────────────
  const updateMeMutation = useUpdateMeMutation()

  const [profileName, setProfileName] = useState("")

  // Sync name from server once loaded
  const displayName = profileName || me?.name || ""

  const handleSaveProfile = async () => {
    if (!displayName.trim()) return
    try {
      await updateMeMutation.mutateAsync({ name: displayName.trim(), avatar: me?.avatar ?? null })
      toast.success(t("profileUpdated"))
    } catch (error) {
      handleErrorApi({ error })
    }
  }

  // ─── Change password form ────────────────────────────────────────────────────
  // agents.md: PUT /account/change-password
  // On success, backend REVOKES ALL refresh tokens → must logout client too
  const changePasswordMutation = useChangePasswordMutation()

  const form = useForm<ChangePasswordBodyType>({
    resolver: zodResolver(ChangePasswordBody),
    defaultValues: { oldPassword: "", newPassword: "", confirmPassword: "" },
  })

  const onSubmitPassword = async (values: ChangePasswordBodyType) => {
    try {
      const result = await changePasswordMutation.mutateAsync(values)
      toast.success(result.payload.message ?? t("passwordUpdated"))
      form.reset()

      // Backend revokes ALL refresh tokens on change-password (agents.md §3.2)
      // → must logout client to avoid stale tokens
      await authApiRequest.logout()
      setRole(undefined)
      router.push("/login")
    } catch (error) {
      handleErrorApi({ error, setError: form.setError })
    }
  }

  return (
    <div className="min-h-screen">
      <AdminHeader title={t("header.title")} subtitle={t("header.subtitle")} />

      <div className="p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

          {/* ── Profile Card ─────────────────────────────────────────────────── */}
          <div className="rounded-md border border-border-subtle bg-card p-6 shadow-card">
            <h2 className="mb-6 text-lg font-bold uppercase tracking-wide text-foreground">
              {t("profileTitle")}
            </h2>

            {/* Avatar */}
            <div className="mb-6 flex justify-center">
              <div
                className="relative h-[120px] w-[120px] cursor-pointer rounded-md"
                onMouseEnter={() => setIsHoveringAvatar(true)}
                onMouseLeave={() => setIsHoveringAvatar(false)}
              >
                <div className="h-full w-full rounded-md bg-primary">
                  <div className="flex h-full w-full items-center justify-center text-4xl font-bold text-primary-foreground">
                    {me?.name?.slice(0, 2).toUpperCase() ?? "AD"}
                  </div>
                </div>
                <div
                  className={`absolute inset-0 flex flex-col items-center justify-center rounded-md bg-black/70 transition-opacity ${isHoveringAvatar ? "opacity-100" : "opacity-0"
                    }`}
                >
                  <Camera className="mb-1 h-6 w-6 text-white" />
                  <span className="text-xs font-medium uppercase tracking-wider text-white">
                    {t("changePhoto")}
                  </span>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("fullNameLabel")}
              </label>
              <input
                type="text"
                value={displayName}
                defaultValue={me?.name}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full rounded-md border border-input-border bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-gold-primary/20 focus:outline-none"
                placeholder={t("fullNamePlaceholder")}
              />
            </div>

            {/* Email — read-only: change email = new identity (agents.md §3.3) */}
            <div className="mb-6">
              <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {t("emailLabel")}
                <span className="ml-2 text-[10px] font-normal text-muted-foreground/60 lowercase tracking-normal">
                  {t("emailReadonly")}
                </span>
              </label>
              <input
                type="email"
                value={me?.email ?? ""}
                defaultValue={me?.email}
                readOnly
                className="w-full cursor-not-allowed rounded-md border border-input-border bg-input px-4 py-3 text-sm text-muted-foreground"
              />
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={updateMeMutation.isPending}
              className="w-full rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-md transition-all hover:shadow-gold"
            >
              {updateMeMutation.isPending ? t("saving") : t("saveChanges")}
            </Button>
          </div>

          {/* ── Security Card ─────────────────────────────────────────────────── */}
          <div className="rounded-md border border-border-subtle bg-card p-6 shadow-card">
            <h2 className="mb-6 text-lg font-bold uppercase tracking-wide text-foreground">
              {t("securityTitle")}
            </h2>

            {/* Warning banner */}
            <div className="mb-4 rounded-md border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-xs text-amber-400">
              {t("securityWarning")}
            </div>

            <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted-foreground">
              {t("changePasswordTitle")}
            </h3>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmitPassword)} noValidate className="space-y-4">

                {/* Old password */}
                <FormField
                  control={form.control}
                  name="oldPassword"
                  render={({ field }) => (
                    <FormItem>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t("currentPasswordLabel")}
                      </label>
                      <div className="relative">
                        <input
                          {...field}
                          type={showCurrentPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="w-full rounded-md border border-input-border bg-input px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-gold-primary/20 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* New password */}
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t("newPasswordLabel")}
                      </label>
                      <div className="relative">
                        <input
                          {...field}
                          type={showNewPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="w-full rounded-md border border-input-border bg-input px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-gold-primary/20 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Confirm password */}
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        {t("confirmPasswordLabel")}
                      </label>
                      <div className="relative">
                        <input
                          {...field}
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="w-full rounded-md border border-input-border bg-input px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-gold-primary/20 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={changePasswordMutation.isPending}
                  className="w-full rounded-md bg-primary py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-md transition-all hover:shadow-gold"
                >
                  {changePasswordMutation.isPending ? t("updating") : t("updatePassword")}
                </Button>
              </form>
            </Form>
          </div>

        </div>
      </div>
    </div>
  )
}