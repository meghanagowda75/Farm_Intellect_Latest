
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Eye,
  Send,
  FileText,
} from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const STORAGE_KEY = "farm_intellect_knowledge_articles";

const categories = [
  "General",
  "Crop Disease",
  "Soil Health",
  "Irrigation",
  "Pest Control",
  "Fertilizer",
  "Market Advice",
  "Weather",
  "Government Schemes",
];

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  author_id: string;
}

const today = new Date();

const daysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
};

const DEFAULT_ARTICLES: Article[] = [
  {
    id: "article-1",
    title: "Understanding Soil pH for Better Yields",
    content:
      "Soil pH is a crucial factor in crop production because it affects nutrient availability. Most crops grow well in slightly acidic to neutral soil, around pH 6.0 to 7.0. Farmers can test soil pH and apply suitable amendments based on the results.",
    category: "Soil Health",
    tags: ["soil", "pH", "nutrients"],
    status: "draft",
    published_at: null,
    created_at: daysAgo(2),
    author_id: "local-expert",
  },
  {
    id: "article-2",
    title: "Managing Fall Armyworm in Maize",
    content:
      "Early detection is important for managing fall armyworm in maize. Check the leaves and growing points regularly for feeding damage and caterpillars. Use integrated pest management practices and follow local agricultural recommendations for control.",
    category: "Pest Control",
    tags: ["maize", "pests", "FAW"],
    status: "draft",
    published_at: null,
    created_at: daysAgo(1),
    author_id: "local-expert",
  },
  {
    id: "article-3",
    title: "Smart Water Management for Farmers",
    content:
      "Efficient irrigation helps conserve water and supports healthy crop growth. Farmers can monitor soil moisture, irrigate during suitable times, and maintain irrigation equipment to reduce water loss. Drip irrigation can be useful for crops where it is suitable.",
    category: "Irrigation",
    tags: ["water", "irrigation", "farming"],
    status: "published",
    published_at: daysAgo(1),
    created_at: daysAgo(3),
    author_id: "local-expert",
  },
];

const normalizeStatus = (status: string | null | undefined) =>
  (status ?? "").trim().toLowerCase();

const loadArticles = (): Article[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored !== null) {
      const parsed: unknown = JSON.parse(stored);

      if (Array.isArray(parsed)) {
        return parsed as Article[];
      }
    }
  } catch (error) {
    console.error("Could not load local articles:", error);
  }

  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(DEFAULT_ARTICLES)
  );

  return DEFAULT_ARTICLES;
};

const saveArticles = (articles: Article[]) => {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(articles)
  );
};

const ExpertKnowledgeHub = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useCurrentUser();
  const { toast } = useToast();

  // Load articles immediately, including on a page refresh.
  const [articles, setArticles] = useState<Article[]>(loadArticles);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("General");
  const [tagsInput, setTagsInput] = useState("");
  const [saving, setSaving] = useState(false);

  const updateArticles = (updatedArticles: Article[]) => {
    saveArticles(updatedArticles);
    setArticles(updatedArticles);
  };

  const resetForm = () => {
    setTitle("");
    setContent("");
    setCategory("General");
    setTagsInput("");
    setEditingId(null);
  };

  const openEdit = (article: Article) => {
    setEditingId(article.id);
    setTitle(article.title);
    setContent(article.content);
    setCategory(article.category);
    setTagsInput(article.tags.join(", "));
    setDialogOpen(true);
  };

  const handleSave = (publish: boolean) => {
    if (!title.trim() || !content.trim()) {
      toast({
        title: "Missing information",
        description: "Enter an article title and content.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    const now = new Date().toISOString();
    const tags = tagsInput
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    const status: "draft" | "published" = publish
      ? "published"
      : "draft";

    let updatedArticles: Article[];

    if (editingId !== null) {
      updatedArticles = articles.map((article) =>
        article.id === editingId
          ? {
              ...article,
              title: title.trim(),
              content: content.trim(),
              category,
              tags,
              status,
              published_at: publish
                ? article.published_at ?? now
                : null,
            }
          : article
      );
    } else {
      const newArticle: Article = {
        id: `article-${Date.now()}`,
        title: title.trim(),
        content: content.trim(),
        category,
        tags,
        status,
        published_at: publish ? now : null,
        created_at: now,
        author_id: user?.id ?? "local-expert",
      };

      updatedArticles = [newArticle, ...articles];
    }

    updateArticles(updatedArticles);

    toast({
      title: publish ? "Article published!" : "Draft saved",
    });

    setSaving(false);
    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = (id: string) => {
    const updatedArticles = articles.filter(
      (article) => article.id !== id
    );

    updateArticles(updatedArticles);
    toast({ title: "Article deleted" });
  };

  const handlePublishToggle = (article: Article) => {
    const isPublished =
      normalizeStatus(article.status) === "published";

    const updatedArticles = articles.map((item) =>
      item.id === article.id
        ? {
            ...item,
            status: isPublished
              ? ("draft" as const)
              : ("published" as const),
            published_at: isPublished
              ? null
              : new Date().toISOString(),
          }
        : item
    );

    updateArticles(updatedArticles);

    toast({
      title: isPublished
        ? "Article moved to drafts"
        : "Article published!",
    });
  };

  const articleStats = {
    total: articles.length,
    published: articles.filter(
      (article) =>
        normalizeStatus(article.status) === "published"
    ).length,
    drafts: articles.filter(
      (article) =>
        normalizeStatus(article.status) === "draft"
    ).length,
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={{
          name: user.name,
          role: "expert",
        }}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole="expert"
      />

      <main className="md:ml-64 pt-16 p-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold text-gradient-tricolor">
              📚 Knowledge Hub
            </h1>

            <Dialog
              open={dialogOpen}
              onOpenChange={(open) => {
                setDialogOpen(open);

                if (!open) {
                  resetForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Article
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingId ? "Edit Article" : "Write New Article"}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      value={title}
                      onChange={(event) =>
                        setTitle(event.target.value)
                      }
                      placeholder="Article title"
                      maxLength={300}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={category}
                        onValueChange={setCategory}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map((item) => (
                            <SelectItem key={item} value={item}>
                              {item}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Tags (comma-separated)</Label>
                      <Input
                        value={tagsInput}
                        onChange={(event) =>
                          setTagsInput(event.target.value)
                        }
                        placeholder="wheat, rabi, tips"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Content</Label>
                    <Textarea
                      value={content}
                      onChange={(event) =>
                        setContent(event.target.value)
                      }
                      placeholder="Write your expert knowledge article..."
                      rows={10}
                      maxLength={10000}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleSave(false)}
                      disabled={saving}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Save Draft
                    </Button>

                    <Button
                      onClick={() => handleSave(true)}
                      disabled={saving}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Publish
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                label: "Total",
                value: articleStats.total,
              },
              {
                label: "Published",
                value: articleStats.published,
              },
              {
                label: "Drafts",
                value: articleStats.drafts,
              },
            ].map((stat) => (
              <Card
                key={stat.label}
                className="tricolor-card"
              >
                <CardContent className="p-4 text-center">
                  <p className="text-2xl font-bold">
                    {stat.value}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stat.label}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Articles List */}
          <Card className="tricolor-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Your Articles
              </CardTitle>
            </CardHeader>

            <CardContent>
              {articles.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p>No articles yet. Write your first one!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {articles.map((article) => (
                    <div
                      key={article.id}
                      className="py-4 space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold">
                            {article.title}
                          </span>

                          <Badge
                            variant={
                              normalizeStatus(article.status) ===
                              "published"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {article.status}
                          </Badge>

                          <Badge variant="outline">
                            {article.category}
                          </Badge>
                        </div>

                        <span className="text-xs text-muted-foreground">
                          {article.created_at
                            ? format(
                                new Date(article.created_at),
                                "MMM dd, yyyy"
                              )
                            : ""}
                        </span>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {article.content}
                      </p>

                      {article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {article.tags.map((tag, index) => (
                            <Badge
                              key={`${article.id}-${tag}-${index}`}
                              variant="outline"
                              className="text-xs"
                            >
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(article)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handlePublishToggle(article)
                          }
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          {normalizeStatus(article.status) ===
                          "published"
                            ? "Unpublish"
                            : "Publish"}
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleDelete(article.id)
                          }
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default ExpertKnowledgeHub;