
import { useEffect, useRef, useState } from "react";
import {
  Canvas as FabricCanvas,
  Rect,
  Circle,
  Polygon,
  type TPointerEvent,
} from "fabric";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Square,
  Circle as CircleIcon,
  Triangle,
  Move,
  RotateCcw,
  Download,
  Layers,
  Ruler,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

type Tool = "select" | "crop" | "irrigation" | "building" | "polygon";
type CropType = "wheat" | "rice" | "cotton" | "maize" | "soybean";

interface Point {
  x: number;
  y: number;
}

const CROP_COLORS: Record<CropType, string> = {
  wheat: "#F4A460",
  rice: "#90EE90",
  cotton: "#FFB6C1",
  maize: "#FFD700",
  soybean: "#8FBC8F",
};

export const InteractiveFieldDesigner = () => {
  const canvasElementRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<FabricCanvas | null>(null);

  const activeToolRef = useRef<Tool>("select");
  const cropTypeRef = useRef<CropType>("wheat");
  const polygonPointsRef = useRef<Point[]>([]);
  const polygonMarkersRef = useRef<Circle[]>([]);

  const [isCanvasReady, setIsCanvasReady] = useState(false);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [selectedCropType, setSelectedCropType] =
    useState<CropType>("wheat");
  const [pointCount, setPointCount] = useState(0);

  const updateTool = (tool: Tool) => {
    activeToolRef.current = tool;
    setActiveTool(tool);

    const canvas = fabricCanvasRef.current;
    if (!canvas) return;

    canvas.selection = tool === "select";
    canvas.defaultCursor =
      tool === "select" ? "default" : "crosshair";
    canvas.hoverCursor =
      tool === "select" ? "move" : "crosshair";
    canvas.requestRenderAll();
  };

  const updateCropType = (crop: CropType) => {
    cropTypeRef.current = crop;
    setSelectedCropType(crop);
  };

  useEffect(() => {
    const element = canvasElementRef.current;
    if (!element) return;

    const canvas = new FabricCanvas(element, {
      width: 800,
      height: 500,
      backgroundColor: "#B8D7A3",
      selection: true,
      preserveObjectStacking: true,
    });

    fabricCanvasRef.current = canvas;
    setIsCanvasReady(true);

    const handleCanvasClick = (event: { e: TPointerEvent }) => {
      const tool = activeToolRef.current;

      // Fabric.js 6/7: getScenePoint replaces the old getPointer API.
      const pointer = canvas.getScenePoint(event.e);
      const x = Math.max(0, Math.min(pointer.x, canvas.getWidth()));
      const y = Math.max(0, Math.min(pointer.y, canvas.getHeight()));

      if (tool === "select") return;

      if (tool === "crop") {
        const crop = cropTypeRef.current;

        const field = new Rect({
          left: Math.max(0, Math.min(x - 50, canvas.getWidth() - 100)),
          top: Math.max(0, Math.min(y - 40, canvas.getHeight() - 80)),
          width: 100,
          height: 80,
          fill: CROP_COLORS[crop],
          stroke: "#2D5016",
          strokeWidth: 2,
          rx: 4,
          ry: 4,
          selectable: true,
          evented: true,
        });

        canvas.add(field);
        canvas.setActiveObject(field);
        canvas.requestRenderAll();

        toast.success(`${crop} field added.`);
        updateTool("select");
        return;
      }

      if (tool === "irrigation") {
        const irrigation = new Circle({
          left: Math.max(0, Math.min(x - 18, canvas.getWidth() - 36)),
          top: Math.max(0, Math.min(y - 18, canvas.getHeight() - 36)),
          radius: 18,
          fill: "#4169E1",
          stroke: "#191970",
          strokeWidth: 2,
          selectable: true,
          evented: true,
        });

        canvas.add(irrigation);
        canvas.setActiveObject(irrigation);
        canvas.requestRenderAll();

        toast.success("Irrigation marker added.");
        updateTool("select");
        return;
      }

      if (tool === "building") {
        const building = new Polygon(
          [
            { x: 0, y: 30 },
            { x: 30, y: 0 },
            { x: 60, y: 30 },
            { x: 60, y: 65 },
            { x: 0, y: 65 },
          ],
          {
            left: Math.max(0, Math.min(x - 30, canvas.getWidth() - 60)),
            top: Math.max(0, Math.min(y - 32, canvas.getHeight() - 65)),
            fill: "#A0522D",
            stroke: "#654321",
            strokeWidth: 2,
            selectable: true,
            evented: true,
          }
        );

        canvas.add(building);
        canvas.setActiveObject(building);
        canvas.requestRenderAll();

        toast.success("Building added.");
        updateTool("select");
        return;
      }

      if (tool === "polygon") {
        polygonPointsRef.current.push({ x, y });

        const marker = new Circle({
          left: x - 4,
          top: y - 4,
          radius: 4,
          fill: "#166534",
          stroke: "#FFFFFF",
          strokeWidth: 1,
          selectable: false,
          evented: false,
        });

        polygonMarkersRef.current.push(marker);
        canvas.add(marker);

        setPointCount(polygonPointsRef.current.length);
        canvas.requestRenderAll();
      }
    };

    canvas.on("mouse:down", handleCanvasClick);
    toast.success("Field Designer ready.");

    return () => {
      canvas.off("mouse:down", handleCanvasClick);
      canvas.dispose();
      fabricCanvasRef.current = null;
    };
  }, []);

  const addCropField = () => {
    if (!fabricCanvasRef.current) {
      toast.error("Canvas is not ready.");
      return;
    }

    updateTool("crop");
    toast.info(`Click on the canvas to place ${selectedCropType}.`);
  };

  const addIrrigation = () => {
    if (!fabricCanvasRef.current) {
      toast.error("Canvas is not ready.");
      return;
    }

    updateTool("irrigation");
    toast.info("Click on the canvas to place irrigation.");
  };

  const addBuilding = () => {
    if (!fabricCanvasRef.current) {
      toast.error("Canvas is not ready.");
      return;
    }

    updateTool("building");
    toast.info("Click on the canvas to place a building.");
  };

  const startPolygon = () => {
    if (!fabricCanvasRef.current) {
      toast.error("Canvas is not ready.");
      return;
    }

    // Start a fresh boundary.
    cancelPolygon();
    updateTool("polygon");
    toast.info("Click at least 3 boundary points on the canvas.");
  };

  const addPolygonPoint = () => {
    if (activeToolRef.current !== "polygon") {
      startPolygon();
      return;
    }

    toast.info("Click on the canvas to add a boundary point.");
  };

  const cancelPolygon = () => {
    const canvas = fabricCanvasRef.current;

    if (canvas) {
      polygonMarkersRef.current.forEach((marker) => canvas.remove(marker));
      canvas.requestRenderAll();
    }

    polygonMarkersRef.current = [];
    polygonPointsRef.current = [];
    setPointCount(0);
  };

  const completePolygon = () => {
    const canvas = fabricCanvasRef.current;
    const points = polygonPointsRef.current;

    if (!canvas) {
      toast.error("Canvas is not ready.");
      return;
    }

    if (points.length < 3) {
      toast.error("Click at least 3 points on the canvas first.");
      return;
    }

    const minX = Math.min(...points.map((point) => point.x));
    const minY = Math.min(...points.map((point) => point.y));

    const localPoints = points.map((point) => ({
      x: point.x - minX,
      y: point.y - minY,
    }));

    const boundary = new Polygon(localPoints, {
      left: minX,
      top: minY,
      fill: "rgba(34, 197, 94, 0.25)",
      stroke: "#166534",
      strokeWidth: 3,
      strokeUniform: true,
      selectable: true,
      evented: true,
      objectCaching: false,
    });

    polygonMarkersRef.current.forEach((marker) => canvas.remove(marker));

    polygonMarkersRef.current = [];
    polygonPointsRef.current = [];
    setPointCount(0);

    canvas.add(boundary);
    canvas.setActiveObject(boundary);
    canvas.requestRenderAll();

    updateTool("select");
    toast.success("Field boundary completed.");
  };

  const clearCanvas = () => {
    const canvas = fabricCanvasRef.current;

    if (!canvas) {
      toast.error("Canvas is not ready.");
      return;
    }

    canvas.clear();
    canvas.backgroundColor = "#B8D7A3";
    canvas.requestRenderAll();

    polygonMarkersRef.current = [];
    polygonPointsRef.current = [];
    setPointCount(0);
    updateTool("select");

    toast.success("Farm layout cleared.");
  };

  const deleteSelectedObject = () => {
    const canvas = fabricCanvasRef.current;
    const selectedObject = canvas?.getActiveObject();

    if (!canvas || !selectedObject) {
      toast.info("Select an object first.");
      return;
    }

    canvas.remove(selectedObject);
    canvas.discardActiveObject();
    canvas.requestRenderAll();

    toast.success("Selected object removed.");
  };

  const exportDesign = () => {
    const canvas = fabricCanvasRef.current;

    if (!canvas) {
      toast.error("Canvas is not ready.");
      return;
    }

    try {
      const dataURL = canvas.toDataURL({
        format: "png",
        multiplier: 1,
      });

      const link = document.createElement("a");
      link.download = "farm-layout.png";
      link.href = dataURL;

      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Farm layout exported as PNG.");
    } catch (error) {
      console.error("Farm layout export failed:", error);
      toast.error("Export failed. Please try again.");
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-primary" />
          Interactive Field Designer
        </CardTitle>

        <p className="text-sm text-muted-foreground">
          Design your farm by placing crops, irrigation markers,
          buildings, and field boundaries.
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={activeTool === "select" ? "default" : "outline"}
            onClick={() => updateTool("select")}
          >
            <Move className="mr-1 h-4 w-4" />
            Select / Move
          </Button>

          <div className="flex flex-wrap items-center gap-1">
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={selectedCropType}
              onChange={(event) =>
                updateCropType(event.target.value as CropType)
              }
              aria-label="Select crop type"
            >
              <option value="wheat">Wheat</option>
              <option value="rice">Rice</option>
              <option value="cotton">Cotton</option>
              <option value="maize">Maize</option>
              <option value="soybean">Soybean</option>
            </select>

            <Button
              size="sm"
              onClick={addCropField}
              disabled={!isCanvasReady}
            >
              <Square className="mr-1 h-4 w-4" />
              Add Crop
            </Button>
          </div>

          <Button
            size="sm"
            variant={activeTool === "irrigation" ? "default" : "outline"}
            onClick={addIrrigation}
            disabled={!isCanvasReady}
          >
            <CircleIcon className="mr-1 h-4 w-4" />
            Irrigation
          </Button>

          <Button
            size="sm"
            variant={activeTool === "polygon" ? "default" : "outline"}
            onClick={startPolygon}
            disabled={!isCanvasReady}
          >
            <Ruler className="mr-1 h-4 w-4" />
            Polygon Mode
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={addPolygonPoint}
            disabled={!isCanvasReady || activeTool !== "polygon"}
          >
            Add Point
          </Button>

          <Button
            size="sm"
            onClick={completePolygon}
            disabled={!isCanvasReady || pointCount < 3}
          >
            Complete Polygon ({pointCount})
          </Button>

          <Button
            size="sm"
            variant={activeTool === "building" ? "default" : "outline"}
            onClick={addBuilding}
            disabled={!isCanvasReady}
          >
            <Triangle className="mr-1 h-4 w-4" />
            Building
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={deleteSelectedObject}
            disabled={!isCanvasReady}
          >
            <Trash2 className="mr-1 h-4 w-4" />
            Delete Selected
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={clearCanvas}
            disabled={!isCanvasReady}
          >
            <RotateCcw className="mr-1 h-4 w-4" />
            Clear
          </Button>

          <Button
            size="sm"
            variant="secondary"
            onClick={exportDesign}
            disabled={!isCanvasReady}
          >
            <Download className="mr-1 h-4 w-4" />
            Export PNG
          </Button>

          {activeTool === "polygon" && (
            <Button size="sm" variant="outline" onClick={() => {
              cancelPolygon();
              updateTool("select");
            }}>
              Cancel Polygon
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="outline">Tool: {activeTool}</Badge>

          {activeTool === "crop" && (
            <Badge variant="secondary">Crop: {selectedCropType}</Badge>
          )}

          {activeTool === "polygon" && (
            <Badge variant="secondary">
              Boundary points: {pointCount}
            </Badge>
          )}
        </div>

        <div className="w-full overflow-x-auto rounded-lg border border-border bg-muted/20">
          <div className="mx-auto w-full min-w-[320px] max-w-[800px]">
            <canvas
              ref={canvasElementRef}
              className="block h-auto max-w-full"
              style={{ touchAction: "pan-y" }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
          {Object.entries(CROP_COLORS).map(([crop, color]) => (
            <div key={crop} className="flex items-center gap-2">
              <div
                className="h-4 w-4 rounded border"
                style={{ backgroundColor: color }}
              />
              <span className="capitalize">{crop}</span>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full border bg-blue-500" />
            <span>Irrigation</span>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-4 w-4 border bg-[#A0522D]" />
            <span>Building</span>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Select a tool and click the canvas to place an object.
          In Polygon Mode, click at least three points and choose
          Complete Polygon to finish the boundary. Use Select / Move
          to reposition objects.
        </p>
      </CardContent>
    </Card>
  );
};
