"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "@/src/i18n/navigation"
import { Spinner } from "@/src/components/ui/spinner"
import { Eye, EyeOff } from "lucide-react"
import { useForm } from 'react-hook-form'
import { Form, FormField, FormItem, FormMessage } from '@/src/components/ui/form'
import { LoginBodySchema, LoginBodyType } from "@/src/schema/auth.schema"
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { useLoginMutation } from "@/src/queries/useAuth"
import { useAppProviderStore } from "@/src/components/app-provider"
export default function LoginPage() {
  const t = useTranslations("LoginPage")
  const router = useRouter()
  const setRole = useAppProviderStore((state) => state.setRole);
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<LoginBodyType>({
    resolver: zodResolver(LoginBodySchema),
    defaultValues: {
      email: '',
      password: ''
    }
  })
  const loginMutation = useLoginMutation();

  const handleSubmit = async (data: LoginBodyType) => {
    try {
      setIsLoading(true)
      const res = await loginMutation.mutateAsync(data)
      console.log("res", res)
      if (res.payload.data) {
        setIsLoading(false)
        const { account } = res.payload.data;
        setRole(account.role)
        toast.success(res.payload.message)
        router.push('/admin')
      }
    } catch (error) {
      console.log(error)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Food Image */}
      <div
        className="hidden lg:flex w-1/2 items-center justify-center relative overflow-hidden bg-card"
        style={{
          backgroundImage: "url('data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 600 800%22><rect fill=%22%23221F1A%22 width=%22600%22 height=%22800%22/></svg>')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-background to-transparent opacity-60" />

        {/* Bottom Overlay Text */}
        <div className="absolute bottom-8 left-0 right-0 z-10 px-8">
          <p className="text-2xl italic text-foreground mb-2">
            {t("tagline")}
          </p>
          <p className="text-sm text-muted-foreground">
            {t("taglineSubtitle")}
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary">
              <span className="text-sm font-bold text-primary-foreground">VG</span>
            </div>
            <span className="text-lg font-bold uppercase tracking-wide text-foreground">
              Viet Gold
            </span>
          </div>

          {/* Heading */}
          <h1 className="mb-2 text-3xl font-bold uppercase tracking-wide text-foreground">
            {t("heading")}
          </h1>

          {/* Subtitle */}
          <p className="mb-8 text-sm text-muted-foreground">
            {t("subheading")}
          </p>


          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

              {/* Email */}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("emailLabel")}
                    </label>
                    <input
                      {...field}
                      type="email"
                      placeholder="admin@vietgold.com"
                      className="w-full rounded-md border border-input border-white bg-input px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Password */}
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <label className="mb-2 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("passwordLabel")}
                    </label>
                    <div className="relative">
                      <input
                        {...field}
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="w-full rounded-md border border-input border-white bg-input px-4 py-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Submit */}
              <button
                disabled={isLoading}
                type="submit"
                // disabled={loginMutation.isPending}
                className="w-full flex items-center justify-center gap-x-2 cursor-pointer rounded-md bg-primary px-4 py-3 text-sm font-bold uppercase tracking-wide text-primary-foreground shadow-md transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Spinner /> : t("submit")}
              </button>

            </form>
          </Form>

          {/* Divider */}
          <div className="my-8 border-t border-border-subtle" />

          {/* Footer */}
          <p className="text-center text-xs text-muted-foreground">
            {t("copyright")}
          </p>
        </div>
      </div>
    </div>
  )
}
