import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { BarChart3, Box, FileJson, MessageSquare } from "lucide-react"

export function CenterPanels() {
  return (
    <div className="h-full flex flex-col bg-background">
      <Tabs defaultValue="plot2d" className="h-full flex flex-col">
        <TabsList className="rounded-none border-b border-border bg-transparent p-0 h-auto justify-start">
          <TabsTrigger
            value="plot2d"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            2D Plots
          </TabsTrigger>
          <TabsTrigger
            value="preview3d"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <Box className="h-4 w-4 mr-2" />
            3D Preview
          </TabsTrigger>
          <TabsTrigger
            value="table"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <FileJson className="h-4 w-4 mr-2" />
            Data Table
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary"
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
        </TabsList>

        {/* 2D Plots Tab */}
        <TabsContent value="plot2d" className="flex-1 overflow-hidden">
          <div className="h-full flex items-center justify-center bg-muted/30">
            <div className="text-center space-y-2">
              <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">2D Plot visualization goes here</p>
            </div>
          </div>
        </TabsContent>

        {/* 3D Preview Tab */}
        <TabsContent value="preview3d" className="flex-1 overflow-hidden">
          <div className="h-full flex items-center justify-center bg-muted/30">
            <div className="text-center space-y-2">
              <Box className="h-12 w-12 mx-auto text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">3D Preview visualization goes here</p>
            </div>
          </div>
        </TabsContent>

        {/* Data Table Tab */}
        <TabsContent value="table" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4">
              <div className="space-y-2">
                <div className="text-sm font-mono text-muted-foreground">
                  {"{\n  \"timestamp\": 1234567890,\n  \"gps_lat\": 37.7749,\n  \"gps_lon\": -122.4194,\n  \"altitude\": 245.3,\n  \"speed\": 15.2\n}"}
                </div>
              </div>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-2 font-mono text-sm">
              <div className="text-emerald-600">[INFO] Loaded flight log: flight-log-2025-04-15.bin</div>
              <div className="text-blue-600">[DEBUG] Parsed 4530 frames</div>
              <div className="text-emerald-600">[INFO] GPS locked with 12 satellites</div>
              <div className="text-yellow-600">[WARN] Magnetic anomaly detected at frame 2341</div>
              <div className="text-emerald-600">[INFO] Playback ready</div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}
