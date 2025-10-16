import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface InspectorProperty {
  label: string
  value: string | number | boolean
}

export function Inspector() {
  // Placeholder properties
  const properties: InspectorProperty[] = [
    { label: "File Name", value: "flight-log-2025-04-15.bin" },
    { label: "Duration", value: "45.3s" },
    { label: "Frames", value: 4530 },
    { label: "Sample Rate", value: "100 Hz" },
    { label: "GPS Sats", value: 12 },
    { label: "Altitude", value: "245.3 m" },
    { label: "Speed", value: "15.2 m/s" },
  ]

  return (
    <div className="h-full border-l border-border bg-muted/40 flex flex-col">
      <div className="px-4 py-3 border-b border-border">
        <h2 className="font-semibold text-sm">Inspector</h2>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {properties.map((prop, idx) => (
            <div key={idx}>
              <div className="text-xs text-muted-foreground font-medium mb-1">
                {prop.label}
              </div>
              <div className="text-sm font-semibold">
                {String(prop.value)}
              </div>
              {idx < properties.length - 1 && <Separator className="mt-3" />}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
