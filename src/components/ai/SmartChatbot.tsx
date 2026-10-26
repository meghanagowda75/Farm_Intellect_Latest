import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import {
  Bot,
  User,
  Send,
  Mic,
  MicOff,
  Image as ImageIcon,
  Sparkles,
  Copy,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { searchKCCQueries, getQueriesByCategory } from "@/data/kisanCallCenter";
import { searchDiseases, getDiseasesByCrop } from "@/data/cropDiseases";

interface Message {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  metadata?: {
    confidence?: number;
    suggestions?: string[];
    imageAnalysis?: boolean;
  };
}

interface ChatResponse {
  content: string;
  metadata: Message["metadata"];
}

export const SmartChatbot = () => {
  const { toast } = useToast();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      type: "bot",
      content:
        "Hello! I'm your mock agricultural assistant. Ask me about crop diseases, fertilizers, farming techniques, government schemes, or market information.",
      timestamp: new Date(),
      metadata: { confidence: 100 }
    }
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateResponse = (userInput: string): ChatResponse => {
    const q = userInput.toLowerCase();

    // 1. Kisan Call Centre knowledge base
    const kccMatches = searchKCCQueries(userInput);

    if (kccMatches.length > 0) {
      const best = kccMatches[0];
      const suggestions = kccMatches
        .slice(1, 3)
        .map((m) => m.question.substring(0, 50) + "...");

      return {
        content: `**${best.question}**\n\n${best.answer}\n\n${
          best.crop ? `_(Crop: ${best.crop})_` : ""
        }`,
        metadata: {
          confidence: best.priority === "high" ? 95 : 85,
          suggestions: suggestions.length
            ? suggestions
            : ["Ask about diseases", "Government schemes", "Market prices"]
        }
      };
    }

    // 2. Crop disease lookup
    const diseaseKeywords = [
      "disease",
      "blight",
      "rust",
      "mildew",
      "spot",
      "wilt",
      "rot",
      "blast",
      "scorch",
      "yellowing",
      "lesion",
      "fungal",
      "bacterial",
      "viral"
    ];

    const hasDiseaseQuery = diseaseKeywords.some((k) => q.includes(k));

    if (hasDiseaseQuery) {
      const diseaseMatches = searchDiseases(userInput);

      if (diseaseMatches.length > 0) {
        const d = diseaseMatches[0];
        const chemical = d.treatment.chemical.slice(0, 2).join("; ");
        const organic = d.treatment.organic.slice(0, 1).join("; ");

        return {
          content: `**${d.diseaseName}** (${d.hindiName}) — ${d.category} disease on **${d.crop}**\n\n**Severity:** ${d.severity.toUpperCase()} | **Yield Loss:** ${d.yieldLoss}\n\n**Symptoms:** ${d.symptoms.slice(0, 3).join("; ")}\n\n**Chemical Treatment:** ${chemical}\n**Organic Option:** ${organic}\n\n**Prevention:** ${d.prevention.slice(0, 2).join("; ")}\n\n_Spread rate: ${d.spreadRate}. Conditions: ${d.conditions.temperature}, humidity ${d.conditions.humidity}_`,
          metadata: {
            confidence: Math.round(d.confidence * 100),
            suggestions: [
              `${d.crop} diseases list`,
              "Ask about prevention",
              "Connect with an expert"
            ]
          }
        };
      }

      const cropNames = [
        "tomato",
        "wheat",
        "rice",
        "potato",
        "cotton",
        "maize",
        "mustard",
        "onion",
        "chickpea",
        "apple",
        "grape",
        "sugarcane"
      ];

      const foundCrop = cropNames.find((c) => q.includes(c));

      if (foundCrop) {
        const diseases = getDiseasesByCrop(
          foundCrop.charAt(0).toUpperCase() + foundCrop.slice(1)
        );

        if (diseases.length > 0) {
          const list = diseases
            .map(
              (d) =>
                `• **${d.diseaseName}** (${d.severity}) — ${d.yieldLoss} yield loss`
            )
            .join("\n");

          return {
            content: `**${foundCrop.charAt(0).toUpperCase() + foundCrop.slice(1)} Diseases** (${diseases.length} known):\n\n${list}\n\nWhich disease would you like details about?`,
            metadata: {
              confidence: 92,
              suggestions: diseases.slice(0, 3).map((d) => d.diseaseName)
            }
          };
        }
      }

      return {
        content:
          "Please describe the symptoms you're seeing (spots, yellowing, wilting, etc.) or mention the crop name for disease information.",
        metadata: {
          confidence: 70,
          suggestions: ["Rice diseases", "Wheat diseases", "Tomato diseases"]
        }
      };
    }

    // 3. Crop management
    const cropMap: Record<string, string> = {
      tomato: "Tomato",
      wheat: "Wheat",
      rice: "Rice",
      potato: "Potato",
      cotton: "Cotton",
      maize: "Maize",
      mustard: "Mustard",
      onion: "Onion"
    };

    const matchedCrop = Object.keys(cropMap).find((c) => q.includes(c));

    if (matchedCrop) {
      const cropQueries = getQueriesByCategory("Crop Management")
        .filter((kcc) => kcc.crop?.toLowerCase() === matchedCrop)
        .slice(0, 3);

      if (cropQueries.length > 0) {
        const topics = cropQueries
          .map((kcc) => `• ${kcc.question}`)
          .join("\n");

        return {
          content: `I can help with **${cropMap[matchedCrop]}** farming! Common questions:\n\n${topics}\n\nAsk about diseases, fertilizer, irrigation, or harvest timing.`,
          metadata: {
            confidence: 88,
            suggestions: cropQueries.map(
              (kcc) => kcc.question.substring(0, 45) + "..."
            )
          }
        };
      }
    }

    // 4. Government schemes
    if (
      q.includes("scheme") ||
      q.includes("subsidy") ||
      q.includes("government") ||
      q.includes("yojana") ||
      q.includes("pm-kisan") ||
      q.includes("pmfby") ||
      q.includes("insurance")
    ) {
      const schemes = getQueriesByCategory("Government Scheme").slice(0, 3);
      const tips = schemes.map((s) => `• ${s.question}`).join("\n");

      return {
        content: `**Government Schemes for Farmers:**\n\n${tips}\n\nAsk me about a specific scheme for more information.`,
        metadata: {
          confidence: 90,
          suggestions: schemes.map(
            (s) => s.question.substring(0, 45) + "..."
          )
        }
      };
    }

    // 5. Organic farming
    if (
      q.includes("organic") ||
      q.includes("jeevamrit") ||
      q.includes("natural farming")
    ) {
      const organic = getQueriesByCategory("Organic Farming").slice(0, 2);
      const best = organic[0];

      return {
        content: best
          ? `**${best.question}**\n\n${best.answer}`
          : "Ask about organic farming methods, jeevamrit preparation, or organic certification.",
        metadata: {
          confidence: 87,
          suggestions: [
            "Organic certification",
            "Jeevamrit recipe",
            "PKVY scheme"
          ]
        }
      };
    }

    // 6. Market information
    if (
      q.includes("market") ||
      q.includes("sell") ||
      q.includes("msp") ||
      q.includes("price") ||
      q.includes("mandi") ||
      q.includes("enam")
    ) {
      const market = getQueriesByCategory("Marketing").slice(0, 2);
      const best = market[0];

      return {
        content: best
          ? `**${best.question}**\n\n${best.answer}`
          : "Ask about MSP prices, eNAM registration, or better prices for your produce.",
        metadata: {
          confidence: 90,
          suggestions: ["MSP rates", "eNAM registration", "Market prices"]
        }
      };
    }

    // 7. Financial information
    if (
      q.includes("loan") ||
      q.includes("kcc") ||
      q.includes("credit") ||
      q.includes("bank") ||
      q.includes("finance")
    ) {
      const finance = getQueriesByCategory("Financial");
      const best = finance[0];

      return {
        content: best
          ? `**${best.question}**\n\n${best.answer}`
          : "Ask about Kisan Credit Card, bank loans, or interest subvention schemes.",
        metadata: {
          confidence: 90,
          suggestions: ["KCC interest rate", "KCC loan limit", "PM-KISAN"]
        }
      };
    }

    // 8. Weather information
    if (
      q.includes("weather") ||
      q.includes("rain") ||
      q.includes("hailstorm") ||
      q.includes("flood") ||
      q.includes("drought") ||
      q.includes("heat")
    ) {
      const weather = getQueriesByCategory("Weather Advisory");
      const best = weather[0];

      return {
        content: best
          ? `**${best.question}**\n\n${best.answer}`
          : "Ask about rainfall advisory, drought management, or heat wave crop protection.",
        metadata: {
          confidence: 85,
          suggestions: [
            "Hailstorm recovery",
            "Flood crop protection",
            "Heat wave advisory"
          ]
        }
      };
    }

    // 9. Soil management
    if (
      q.includes("soil") ||
      q.includes("ph") ||
      q.includes("alkaline") ||
      q.includes("saline") ||
      q.includes("mitti")
    ) {
      const soil = getQueriesByCategory("Soil Management");
      const best = soil[0];

      return {
        content: best
          ? `**${best.question}**\n\n${best.answer}`
          : "Ask about soil testing, soil health cards, or improving soil quality.",
        metadata: {
          confidence: 88,
          suggestions: [
            "Soil sample collection",
            "Soil Health Card",
            "Alkaline soil treatment"
          ]
        }
      };
    }

    // 10. Water management
    if (
      q.includes("water") ||
      q.includes("irrigation") ||
      q.includes("drip") ||
      q.includes("sprinkler") ||
      q.includes("harvest water")
    ) {
      const water = getQueriesByCategory("Water Management");
      const best = water[0];

      return {
        content: best
          ? `**${best.question}**\n\n${best.answer}`
          : "Ask about irrigation methods, rainwater harvesting, or drip irrigation subsidies.",
        metadata: {
          confidence: 87,
          suggestions: [
            "Rainwater harvesting",
            "Drip irrigation subsidy",
            "Farm pond construction"
          ]
        }
      };
    }

    // Default response
    return {
      content:
        "I'm your mock farm advisor. You can ask me about:\n\n🌱 **Crop diseases and treatments**\n🧪 **Fertilizer and soil management**\n💧 **Irrigation and water conservation**\n🏛️ **Government schemes**\n📊 **Market prices and MSP**\n🌿 **Organic farming**\n\nCall the KCC helpline: **1800-180-1551** (Toll Free)",
      metadata: {
        confidence: 75,
        suggestions: [
          "Crop disease identification",
          "Government schemes",
          "MSP prices"
        ]
      }
    };
  };

  const handleSend = () => {
    if (!input.trim() && !selectedImage) return;

    const currentInput = input.trim();
    const image = selectedImage;
    const now = Date.now();

    const userMessage: Message = {
      id: now.toString(),
      type: "user",
      content: image
        ? `[Image selected: ${image.name}] ${currentInput}`
        : currentInput,
      timestamp: new Date(),
      metadata: image ? { imageAnalysis: true } : undefined
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Local mock response only; no backend or Supabase request
    const response: ChatResponse = image
      ? {
          content:
            "Mock mode: Image analysis is not connected. Please describe the crop and its symptoms in text to get information from the local knowledge base.",
          metadata: {
            confidence: 0,
            suggestions: [
              "Describe the crop symptoms",
              "Ask about crop diseases"
            ]
          }
        }
      : generateResponse(currentInput);

    const botMessage: Message = {
      id: (now + 1).toString(),
      type: "bot",
      content: response.content,
      timestamp: new Date(),
      metadata: response.metadata
    };

    setMessages((prev) => [...prev, botMessage]);
    setIsLoading(false);
    setSelectedImage(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (file) {
      setSelectedImage(file);
      toast({
        title: "Image Selected",
        description: `${file.name} is ready for mock-mode testing`
      });
    }
  };

  const startVoiceRecognition = () => {
    if (
      "webkitSpeechRecognition" in window ||
      "SpeechRecognition" in window
    ) {
      const SpeechRecognition =
        (window as any).webkitSpeechRecognition ||
        (window as any).SpeechRecognition;

      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        toast({
          title: "Listening...",
          description: "Speak your question now"
        });
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
        toast({
          title: "Voice Recognition Error",
          description: "Please try again or type your question",
          variant: "destructive"
        });
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } else {
      toast({
        title: "Voice Recognition Not Supported",
        description: "Please type your question",
        variant: "destructive"
      });
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast({
      title: "Copied to Clipboard",
      description: "Message content copied successfully"
    });
  };

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop =
        scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Agricultural Assistant
          <Badge variant="secondary" className="ml-auto">
            <Sparkles className="h-3 w-3 mr-1" />
            Mock Mode
          </Badge>
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.type === "user"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                {message.type === "bot" && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}

                <div
                  className={`max-w-[80%] ${
                    message.type === "user" ? "order-2" : ""
                  }`}
                >
                  <div
                    className={`p-3 rounded-lg ${
                      message.type === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted"
                    }`}
                  >
                    <div className="prose prose-sm max-w-none">
                      {message.content.split("\n").map((line, index) => (
                        <p key={index} className="mb-1 last:mb-0">
                          {line.split("**").map((part, i) =>
                            i % 2 === 1 ? (
                              <strong key={i}>{part}</strong>
                            ) : (
                              part
                            )
                          )}
                        </p>
                      ))}
                    </div>

                    {message.metadata?.imageAnalysis && (
                      <Badge variant="outline" className="mt-2">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        Mock Image Request
                      </Badge>
                    )}
                  </div>

                  {message.metadata?.confidence !== undefined && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Confidence: {message.metadata.confidence}%
                    </div>
                  )}

                  {message.metadata?.suggestions && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {message.metadata.suggestions.map(
                        (suggestion, index) => (
                          <Button
                            key={index}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => setInput(suggestion)}
                          >
                            {suggestion}
                          </Button>
                        )
                      )}
                    </div>
                  )}

                  {message.type === "bot" && (
                    <div className="flex gap-1 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyMessage(message.content)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>

                      <Button variant="ghost" size="sm">
                        <ThumbsUp className="h-3 w-3" />
                      </Button>

                      <Button variant="ghost" size="sm">
                        <ThumbsDown className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                {message.type === "user" && (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center order-1">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary animate-pulse" />
                </div>

                <div className="bg-muted p-3 rounded-lg">
                  <div className="flex gap-1">
                    <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" />
                    <div
                      className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          {selectedImage && (
            <div className="mb-3 p-2 bg-muted rounded flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                <span className="text-sm">{selectedImage.name}</span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedImage(null);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                  }
                }}
              >
                Remove
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about crops, diseases, fertilizers..."
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              className="flex-1"
            />

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />

            <Button
              variant="outline"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="h-4 w-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={startVoiceRecognition}
              disabled={isListening}
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            <Button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && !selectedImage)}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};