import { ComponentProps } from "react"
import { cn } from "@/lib/utils"

const cardVariants = {
  default: "rounded-xl border border-border/60 bg-card/90 text-card-foreground shadow-lg shadow-black/10 backdrop-blur-sm",
  flat: "rounded-lg border border-border/40 bg-card/90 text-card-foreground shadow-sm hover:shadow-md hover:-translate-y-px transition-all duration-200",
}

function Card({ className, variant = "default", ...props }: ComponentProps<"div"> & { variant?: keyof typeof cardVariants }) {
  return (
    <div
      className={cn(
        cardVariants[variant],
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 p-6", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("p-6 pt-0", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("flex items-center p-6 pt-0", className)}
      {...props}
    />
  )
}

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent }
