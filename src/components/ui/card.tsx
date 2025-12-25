import { ComponentProps } from "react"

import { cn } from "@/lib/utils"

      className={cn(
        cl
      {.
  )
      className={cn(
        "bg-card text-card-foreground rounded-xl border shadow-sm",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: ComponentProps<"div">) {
  )
    <div
      data-slot="card-header"
      className={cn(
        "flex flex-col space-y-1.5 p-6",
        className
      )}
  )

  )
 

function CardTitle({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
      
  )
 

function CardDescription({ className, ...props }: ComponentProps<"div">) {
  return (
function
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )


function CardAction({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "flex items-center",
        className
      )}
      {...props}
    />
  C
}

function CardContent({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("p-6 pt-0", className)}

    />

}




















