import { useRef, useState } from "react";
import {
  PlayCircle,
  BookOpen,
  Video,
  ExternalLink,
  Headphones,
  Image as ImageIcon,
  FileText,
  Pause,
  Download,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { AspectRatio } from "@/components/ui/aspect-ratio";
import { getAssetUrl } from "@/utils/assets";

export const KnowledgeHub = () => {
  const [playingPodcast, setPlayingPodcast] = useState<string | null>(null);
  const audioRefs = useRef<Record<string, HTMLAudioElement | null>>({});

  const podcasts = [
    {
      id: "podcast-1",
      title: "Farm Intellect Boosts Yields",
      description:
        "Learn how AI-powered advisory systems help farmers increase crop yields through data-driven decisions.",
      src: "/knowledge/podcasts/smart-crop-advisory-yields.m4a",
      duration: "~5 min",
      category: "AI Advisory",
    },
    {
      id: "podcast-2",
      title: "AI Plant Diagnosis & Market Alerts",
      description:
        "Discover how machine learning identifies plant diseases and provides real-time market intelligence.",
      src: "/knowledge/podcasts/ai-plant-diagnosis-market.m4a",
      duration: "~5 min",
      category: "Disease Detection",
    },
  ];

  const infographics = [
    {
      id: "infographic-1",
      title: "Farm Intellect: Revolutionizing Agriculture",
      description:
        "Complete overview of AI-powered farming, from challenges to solutions, technology architecture, and future roadmap.",
      src: "/knowledge/infographics/smart-crop-advisory.png",
      category: "Platform Overview",
    },
  ];

  const slides = [
    {
      id: "slides-1",
      title: "Smart Crop Intelligence - Executive Explainer",
      description:
        "Comprehensive presentation covering platform concept, features, architecture, and implementation roadmap.",
      src: "/knowledge/slides/smart-crop-intelligence.pdf",
      pages: 12,
      category: "Project Overview",
    },
  ];

  const videos = [
    {
      id: 1,
      title: "Wheat Farming Best Practices (गेहूं की खेती)",
      description: "Learn modern techniques for wheat cultivation.",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      duration: "12:30",
      category: "Crops",
    },
    {
      id: 2,
      title: "Organic Pest Control (जैविक कीट नियंत्रण)",
      description: "Natural methods to control pests without chemicals.",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      duration: "8:45",
      category: "Pest Control",
    },
    {
      id: 3,
      title: "Drip Irrigation Setup (ड्रिप सिंचाई)",
      description: "How to install and maintain a drip irrigation system.",
      thumbnail: "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      duration: "15:20",
      category: "Irrigation",
    },
  ];

  const togglePodcast = async (podcastId: string) => {
    const audio = audioRefs.current[podcastId];

    if (!audio) return;

    if (playingPodcast === podcastId) {
      audio.pause();
      setPlayingPodcast(null);
      return;
    }

    Object.entries(audioRefs.current).forEach(([id, element]) => {
      if (id !== podcastId && element) {
        element.pause();
        element.currentTime = 0;
      }
    });

    try {
      await audio.play();
      setPlayingPodcast(podcastId);
    } catch (error) {
      console.error("Unable to play podcast:", error);
      setPlayingPodcast(null);
    }
  };

  const openAsset = (src: string) => {
    window.open(getAssetUrl(src), "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-r from-primary/5 via-background to-accent/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            Knowledge Hub (ज्ञान केंद्र)
          </CardTitle>
        </CardHeader>

        <CardContent>
          <p className="text-muted-foreground">
            Learn from expert farmers and agricultural scientists through
            podcasts, infographics, slides, and videos.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="podcasts" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger
            value="podcasts"
            className="flex items-center gap-2"
          >
            <Headphones className="h-4 w-4" />
            <span className="hidden sm:inline">Podcasts</span>
          </TabsTrigger>

          <TabsTrigger
            value="infographics"
            className="flex items-center gap-2"
          >
            <ImageIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Infographics</span>
          </TabsTrigger>

          <TabsTrigger value="slides" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Slides</span>
          </TabsTrigger>

          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Videos</span>
          </TabsTrigger>
        </TabsList>

        {/* Podcasts Tab */}
        <TabsContent value="podcasts" className="space-y-4">
          <h3 className="flex items-center gap-2 text-xl font-semibold">
            <Headphones className="h-5 w-5 text-primary" />
            AI-Generated Podcasts
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {podcasts.map((podcast) => (
              <Card
                key={podcast.id}
                className="group border-2 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      aria-label={
                        playingPodcast === podcast.id
                          ? "Pause podcast"
                          : "Play podcast"
                      }
                      className={`cursor-pointer rounded-full p-4 transition-all ${
                        playingPodcast === podcast.id
                          ? "animate-pulse bg-primary text-primary-foreground"
                          : "bg-primary/10 hover:bg-primary/20"
                      }`}
                      onClick={() => void togglePodcast(podcast.id)}
                    >
                      {playingPodcast === podcast.id ? (
                        <Pause className="h-8 w-8" />
                      ) : (
                        <PlayCircle className="h-8 w-8 text-primary" />
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="mb-1 flex items-center gap-2">
                        <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs text-accent-foreground">
                          {podcast.category}
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {podcast.duration}
                        </span>
                      </div>

                      <h4 className="mb-2 font-semibold">
                        {podcast.title}
                      </h4>

                      <p className="text-sm text-muted-foreground">
                        {podcast.description}
                      </p>
                    </div>
                  </div>

                  <audio
                    ref={(element) => {
                      audioRefs.current[podcast.id] = element;
                    }}
                    src={getAssetUrl(podcast.src)}
                    onEnded={() => setPlayingPodcast(null)}
                    onPause={() => {
                      if (playingPodcast === podcast.id) {
                        setPlayingPodcast(null);
                      }
                    }}
                    className="hidden"
                  />

                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => void togglePodcast(podcast.id)}
                    >
                      {playingPodcast === podcast.id ? (
                        <>
                          <Pause className="mr-2 h-4 w-4" />
                          Pause
                        </>
                      ) : (
                        <>
                          <PlayCircle className="mr-2 h-4 w-4" />
                          Listen Now
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Infographics Tab */}
        <TabsContent value="infographics" className="space-y-4">
          <h3 className="flex items-center gap-2 text-xl font-semibold">
            <ImageIcon className="h-5 w-5 text-primary" />
            Visual Guides & Infographics
          </h3>

          <div className="grid grid-cols-1 gap-6">
            {infographics.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden transition-shadow hover:shadow-lg"
              >
                <div className="relative">
                  <img
                    src={getAssetUrl(item.src)}
                    alt={item.title}
                    className="h-auto w-full cursor-pointer object-contain"
                    onClick={() => openAsset(item.src)}
                  />

                  <div className="absolute left-2 top-2 rounded-full bg-primary px-3 py-1 text-sm font-medium text-primary-foreground">
                    {item.category}
                  </div>
                </div>

                <CardContent className="p-4">
                  <h4 className="mb-2 font-semibold">{item.title}</h4>

                  <p className="mb-3 text-sm text-muted-foreground">
                    {item.description}
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAsset(item.src)}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Full Size
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Slides Tab */}
        <TabsContent value="slides" className="space-y-4">
          <h3 className="flex items-center gap-2 text-xl font-semibold">
            <FileText className="h-5 w-5 text-primary" />
            Presentation Slides
          </h3>

          <div className="grid grid-cols-1 gap-6">
            {slides.map((item) => (
              <Card
                key={item.id}
                className="overflow-hidden transition-shadow hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-red-500/10 p-4">
                      <FileText className="h-12 w-12 text-red-500" />
                    </div>

                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs text-primary">
                          {item.category}
                        </span>

                        <span className="text-xs text-muted-foreground">
                          {item.pages} pages
                        </span>
                      </div>

                      <h4 className="mb-2 text-lg font-semibold">
                        {item.title}
                      </h4>

                      <p className="mb-4 text-sm text-muted-foreground">
                        {item.description}
                      </p>

                      <div className="flex gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => openAsset(item.src)}
                        >
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View PDF
                        </Button>

                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={getAssetUrl(item.src)}
                            download
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </a>
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Videos Tab */}
        <TabsContent value="videos" className="space-y-4">
          <h3 className="flex items-center gap-2 text-xl font-semibold">
            <Video className="h-5 w-5 text-primary" />
            Educational Videos
          </h3>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {videos.map((video) => (
              <Card
                key={video.id}
                className="group transition-shadow hover:shadow-lg"
              >
                <div className="relative">
                  <AspectRatio ratio={16 / 9}>
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="h-full w-full rounded-t-lg object-cover"
                    />
                  </AspectRatio>

                  <div className="absolute inset-0 flex items-center justify-center rounded-t-lg bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      size="lg"
                      className="bg-white text-black hover:bg-gray-100"
                      onClick={() =>
                        window.open(
                          video.url,
                          "_blank",
                          "noopener,noreferrer"
                        )
                      }
                    >
                      <PlayCircle className="mr-2 h-6 w-6" />
                      Watch Now
                    </Button>
                  </div>

                  <div className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-sm text-white">
                    {video.duration}
                  </div>

                  <div className="absolute left-2 top-2 rounded bg-primary px-2 py-1 text-sm text-primary-foreground">
                    {video.category}
                  </div>
                </div>

                <CardContent className="p-4">
                  <h4 className="mb-2 line-clamp-2 font-semibold">
                    {video.title}
                  </h4>

                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {video.description}
                  </p>

                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3 w-full"
                    onClick={() =>
                      window.open(
                        video.url,
                        "_blank",
                        "noopener,noreferrer"
                      )
                    }
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Watch on YouTube
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Community Links */}
      <Card>
        <CardHeader>
          <CardTitle>Join Farming Communities</CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() =>
              window.open(
                "https://t.me/farmer_community",
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            <ExternalLink className="mr-3 h-5 w-5" />
            Join Telegram Group - Punjab Farmers
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={() =>
              window.open(
                "https://wa.me/919876543210",
                "_blank",
                "noopener,noreferrer"
              )
            }
          >
            <ExternalLink className="mr-3 h-5 w-5" />
            WhatsApp Expert Support
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};