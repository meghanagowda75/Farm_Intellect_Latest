import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  Users,
  MessageSquare,
  ThumbsUp,
  Share2,
  Eye,
  Star,
  MapPin,
  Calendar,
  Award,
  Zap,
  TrendingUp,
  CheckCircle,
  Plus,
  Camera,
  Upload,
  X,
  Send,
  ExternalLink,
  Pencil,
  Trash2,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Category = "success" | "question" | "tip" | "problem";

interface FarmerComment {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  likes: number;
  isMine?: boolean;
  liked?: boolean;
}

interface FarmerPost {
  id: string;
  farmer: string;
  location: string;
  avatar: string;
  timestamp: string;
  content: string;
  images: string[];
  attachmentNames?: string[];
  likes: number;
  comments: FarmerComment[];
  shares: number;
  views: number;
  category: Category;
  verified?: boolean;
  liked: boolean;
  isMine?: boolean;
}

interface Expert {
  name: string;
  expertise: string;
  rating: number;
  consultations: number;
  verified: boolean;
}

const STORAGE_KEY = "farm-intellect-collaboration-hub-v3";
const MAX_FILE_SIZE = 2 * 1024 * 1024;

const initialPosts: FarmerPost[] = [
  {
    id: "1",
    farmer: "Rajesh Kumar",
    location: "Punjab, India",
    avatar: "",
    timestamp: "2 hours ago",
    content:
      "🌾 Amazing results with my wheat crop this season! I used AI recommendations and observed a better crop. Share your farming experience and results with the community.",
    images: [],
    likes: 47,
    comments: [
      {
        id: "c1",
        author: "Mohan Singh",
        content: "Can you share more details about your irrigation schedule?",
        timestamp: "1 hour ago",
        likes: 8,
      },
      {
        id: "c2",
        author: "Sunita Devi",
        content: "Which variety of wheat did you use?",
        timestamp: "45 minutes ago",
        likes: 5,
      },
    ],
    shares: 8,
    views: 125,
    category: "success",
    verified: true,
    liked: false,
    isMine: false,
  },
  {
    id: "2",
    farmer: "Priya Sharma",
    location: "Maharashtra, India",
    avatar: "",
    timestamp: "4 hours ago",
    content:
      "🤔 Need help! My cotton plants are showing yellow leaves in some patches. Has anyone faced this issue? Please share possible causes and safe next steps.",
    images: [],
    likes: 23,
    comments: [
      {
        id: "c3",
        author: "Anita Reddy",
        content:
          "Check whether the yellowing starts on older or newer leaves, and inspect the roots and soil moisture.",
        timestamp: "2 hours ago",
        likes: 4,
      },
    ],
    shares: 5,
    views: 86,
    category: "question",
    liked: false,
    isMine: false,
  },
  {
    id: "3",
    farmer: "Suresh Patel",
    location: "Gujarat, India",
    avatar: "",
    timestamp: "1 day ago",
    content:
      "💡 Pro tip: Intercropping maize with soybean can be useful when the crop combination, spacing, and local conditions are suitable. Always adapt the method to your soil and climate.",
    images: [],
    likes: 89,
    comments: [],
    shares: 34,
    views: 214,
    category: "tip",
    verified: true,
    liked: false,
    isMine: false,
  },
  {
    id: "4",
    farmer: "Anita Reddy",
    location: "Andhra Pradesh, India",
    avatar: "",
    timestamp: "2 days ago",
    content:
      "🚨 Farmers, inspect rice crops regularly for pests and unusual symptoms. Confirm the pest before applying any treatment and follow local agricultural advisories.",
    images: [],
    likes: 156,
    comments: [],
    shares: 78,
    views: 348,
    category: "problem",
    liked: false,
    isMine: false,
  },
];

const experts: Expert[] = [
  {
    name: "Dr. Ramesh Chand",
    expertise: "Soil Science",
    rating: 4.9,
    consultations: 1247,
    verified: true,
  },
  {
    name: "Prof. Sunita Verma",
    expertise: "Crop Protection",
    rating: 4.8,
    consultations: 892,
    verified: true,
  },
  {
    name: "Amit Agricultural Expert",
    expertise: "Organic Farming",
    rating: 4.7,
    consultations: 634,
    verified: false,
  },
  {
    name: "Dr. Krishnan Pillai",
    expertise: "Water Management",
    rating: 4.9,
    consultations: 1108,
    verified: true,
  },
];

const templates: {
  title: string;
  icon: string;
  text: string;
  category: Category;
}[] = [
  {
    icon: "🏆",
    title: "Success Story",
    text: "🌾 Success story: My crop was ___. I tried ___. My observations were ___.",
    category: "success",
  },
  {
    icon: "❓",
    title: "Ask Question",
    text: "🤔 I need help with ___. My crop is ___. The symptoms or issue are ___.",
    category: "question",
  },
  {
    icon: "💡",
    title: "Share Tip",
    text: "💡 Farming tip: I tried ___. It may help farmers who ___.",
    category: "tip",
  },
  {
    icon: "🚨",
    title: "Alert/Warning",
    text: "🚨 Farming alert in ___. Crop or issue: ___. Observed symptoms: ___.",
    category: "problem",
  },
];

const categoryColors: Record<Category, string> = {
  success:
    "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200",
  question:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  tip: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-200",
  problem: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200",
};

const categoryIcon = (category: Category) => {
  switch (category) {
    case "success":
      return <Award className="h-4 w-4" />;
    case "question":
      return <MessageSquare className="h-4 w-4" />;
    case "tip":
      return <Zap className="h-4 w-4" />;
    case "problem":
      return <CheckCircle className="h-4 w-4" />;
  }
};

const makeId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const timeLabel = () => "Just now";

function loadSavedPosts(): FarmerPost[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      const parsed: unknown = JSON.parse(saved);

      if (Array.isArray(parsed)) {
        return parsed.map((item: FarmerPost) => ({
          ...item,
          likes: Number.isFinite(item.likes) ? item.likes : 0,
          shares: Number.isFinite(item.shares) ? item.shares : 0,
          views: Number.isFinite(item.views) ? item.views : 0,
          liked: item.liked === true,
          isMine: item.isMine === true,
          comments: Array.isArray(item.comments)
            ? item.comments.map((comment: FarmerComment) => ({
                ...comment,
                likes: Number.isFinite(comment.likes)
                  ? comment.likes
                  : 0,
                liked: comment.liked === true,
                isMine: comment.isMine === true,
              }))
            : [],
          images: Array.isArray(item.images) ? item.images : [],
          attachmentNames: Array.isArray(item.attachmentNames)
            ? item.attachmentNames
            : [],
        }));
      }
    }
  } catch {
    // If saved data is invalid, start with the sample posts.
  }

  return initialPosts;
}

export const FarmerCollaborationHub = () => {
  // Load saved posts BEFORE rendering. This prevents initial sample data
  // from overwriting the user's saved posts, likes, and comments.
  const [posts, setPosts] = useState<FarmerPost[]>(loadSavedPosts);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [newPost, setNewPost] = useState("");
  const [newCategory, setNewCategory] = useState<Category>("question");
  const [author, setAuthor] = useState("You");
  const [location, setLocation] = useState("");
  const [attachments, setAttachments] = useState<string[]>([]);
  const [attachmentNames, setAttachmentNames] = useState<string[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [search, setSearch] = useState("");

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostDraft, setEditPostDraft] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentDraft, setEditCommentDraft] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Persist state changes. Posts are loaded synchronously above, so this
  // effect will not first overwrite saved posts with the sample data.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(posts));
    } catch {
      toast.error(
        "Browser storage is full. Remove large attachments or delete old posts.",
      );
    }
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const categoryMatches =
        selectedCategory === "all" || post.category === selectedCategory;

      const query = search.trim().toLowerCase();

      const searchMatches =
        !query ||
        post.content.toLowerCase().includes(query) ||
        post.farmer.toLowerCase().includes(query) ||
        post.location.toLowerCase().includes(query);

      return categoryMatches && searchMatches;
    });
  }, [posts, selectedCategory, search]);

  const selectedPost =
    posts.find((post) => post.id === selectedPostId) ?? null;

  const updatePost = (
    postId: string,
    updater: (post: FarmerPost) => FarmerPost,
  ) => {
    setPosts((current) =>
      current.map((post) =>
        post.id === postId ? updater(post) : post,
      ),
    );
  };

  // Like and unlike toggle correctly, and the count is saved after each change.
  const handleLike = (postId: string) => {
    updatePost(postId, (post) => {
      const liked = !post.liked;

      return {
        ...post,
        liked,
        likes: Math.max(0, post.likes + (liked ? 1 : -1)),
      };
    });
  };

  const startEditPost = (post: FarmerPost) => {
    if (!post.isMine) {
      toast.error("You can only edit your own posts.");
      return;
    }

    setEditingPostId(post.id);
    setEditPostDraft(post.content);
  };

  const saveEditPost = (postId: string) => {
    if (!editPostDraft.trim()) {
      toast.error("Post content cannot be empty.");
      return;
    }

    updatePost(postId, (post) =>
      post.isMine
        ? { ...post, content: editPostDraft.trim() }
        : post,
    );

    setEditingPostId(null);
    setEditPostDraft("");
    toast.success("Post updated successfully.");
  };

  const deletePost = (post: FarmerPost) => {
    if (!post.isMine) {
      toast.error("You can only delete your own posts.");
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to delete this post and all its comments?",
    );

    if (!confirmed) return;

    setPosts((current) =>
      current.filter((item) => item.id !== post.id),
    );

    if (selectedPostId === post.id) {
      setSelectedPostId(null);
      setCommentDraft("");
    }

    if (editingPostId === post.id) {
      setEditingPostId(null);
      setEditPostDraft("");
    }

    toast.success("Your post has been deleted.");
  };

  const startEditComment = (comment: FarmerComment) => {
    if (!comment.isMine) {
      toast.error("You can only edit your own comments.");
      return;
    }

    setEditingCommentId(comment.id);
    setEditCommentDraft(comment.content);
  };

  const saveEditComment = (postId: string, commentId: string) => {
    if (!editCommentDraft.trim()) {
      toast.error("Comment cannot be empty.");
      return;
    }

    updatePost(postId, (post) => ({
      ...post,
      comments: post.comments.map((comment) =>
        comment.id === commentId && comment.isMine
          ? { ...comment, content: editCommentDraft.trim() }
          : comment,
      ),
    }));

    setEditingCommentId(null);
    setEditCommentDraft("");
    toast.success("Comment updated successfully.");
  };

  const deleteComment = (
    postId: string,
    comment: FarmerComment,
  ) => {
    if (!comment.isMine) {
      toast.error("You can only delete your own comments.");
      return;
    }

    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    updatePost(postId, (post) => ({
      ...post,
      comments: post.comments.filter(
        (item) => item.id !== comment.id,
      ),
    }));

    if (editingCommentId === comment.id) {
      setEditingCommentId(null);
      setEditCommentDraft("");
    }

    toast.success("Your comment has been deleted.");
  };

  const handleShare = async (post: FarmerPost) => {
    const shareText = `${post.content}\n\n— ${post.farmer}, ${post.location}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Farm Intellect - Farmer Collaboration Hub",
          text: shareText,
        });

        updatePost(post.id, (current) => ({
          ...current,
          shares: current.shares + 1,
        }));
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareText);

        updatePost(post.id, (current) => ({
          ...current,
          shares: current.shares + 1,
        }));

        toast.success("Post copied. You can now paste and share it.");
      } else {
        window.prompt("Copy this post to share it:", shareText);
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        toast.error("Could not share the post. Please try again.");
      }
    }
  };

  const openComments = (post: FarmerPost) => {
    setSelectedPostId(post.id);
  };

  const handleComment = () => {
    if (!selectedPostId || !commentDraft.trim()) {
      toast.error("Write a comment first.");
      return;
    }

    const comment: FarmerComment = {
      id: makeId(),
      author: author.trim() || "You",
      content: commentDraft.trim(),
      timestamp: timeLabel(),
      likes: 0,
      liked: false,
      isMine: true,
    };

    updatePost(selectedPostId, (post) => ({
      ...post,
      comments: [...post.comments, comment],
    }));

    setCommentDraft("");
    toast.success("Comment added.");
  };

  const submitPost = () => {
    if (!newPost.trim()) {
      toast.error("Please write something before sharing.");
      return;
    }

    const post: FarmerPost = {
      id: makeId(),
      farmer: author.trim() || "You",
      location: location.trim() || "Location not provided",
      avatar: "",
      timestamp: timeLabel(),
      content: newPost.trim(),
      images: [...attachments],
      attachmentNames: [...attachmentNames],
      likes: 0,
      comments: [],
      shares: 0,
      views: 0,
      category: newCategory,
      liked: false,
      isMine: true,
    };

    setPosts((current) => [post, ...current]);
    setNewPost("");
    setAttachments([]);
    setAttachmentNames([]);
    setSelectedCategory("all");
    setSearch("");

    toast.success("Your post has been added to the feed.");
  };

  const handleFiles = (
    event: ChangeEvent<HTMLInputElement>,
    allowImagesOnly: boolean,
  ) => {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) return;

    const validFiles = files.filter((file) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is larger than 2 MB.`);
        return false;
      }

      if (allowImagesOnly && !file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image.`);
        return false;
      }

      if (
        !allowImagesOnly &&
        !file.type.startsWith("image/") &&
        file.type !== "application/pdf" &&
        !file.type.startsWith("text/")
      ) {
        toast.error("Choose an image, PDF, or text document.");
        return false;
      }

      return true;
    });

    if (validFiles.length) {
      const readers = validFiles.map(
        (file) =>
          new Promise<{ name: string; data: string }>(
            (resolve, reject) => {
              const reader = new FileReader();

              reader.onload = () =>
                resolve({
                  name: file.name,
                  data: String(reader.result),
                });

              reader.onerror = () =>
                reject(new Error("File could not be read."));

              reader.readAsDataURL(file);
            },
          ),
      );

      Promise.all(readers)
        .then((results) => {
          setAttachments((current) => [
            ...current,
            ...results.map((result) => result.data),
          ]);

          setAttachmentNames((current) => [
            ...current,
            ...results.map((result) => result.name),
          ]);

          toast.success(`${results.length} file(s) attached.`);
        })
        .catch(() => {
          toast.error("Could not read the selected file.");
        });
    }

    event.target.value = "";
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Location is not supported by this browser.");
      return;
    }

    toast("Requesting location permission…");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const mapsLink = `https://maps.google.com/?q=${latitude},${longitude}`;

        setLocation(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);

        setNewPost((current) =>
          current.includes(mapsLink)
            ? current
            : `${current}${current ? "\n\n" : ""}📍 Location: ${mapsLink}`,
        );

        toast.success("Location added to your post.");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          toast.error(
            "Location permission was denied. Allow it in browser settings.",
          );
        } else {
          toast.error("Unable to get your location. Try again.");
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  const likeComment = (postId: string, commentId: string) => {
    updatePost(postId, (post) => ({
      ...post,
      comments: post.comments.map((comment) => {
        if (comment.id !== commentId) return comment;

        const liked = !comment.liked;

        return {
          ...comment,
          liked,
          likes: Math.max(0, comment.likes + (liked ? 1 : -1)),
        };
      }),
    }));
  };

  const contactExpert = (expert: Expert) => {
    const subject = encodeURIComponent(
      "Farm Intellect - Farming consultation",
    );

    const body = encodeURIComponent(
      `Hello ${expert.name},\n\nI would like to ask about ${expert.expertise}.\n\nThank you.`,
    );

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
    toast("Your email app may open if one is configured.");
  };

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Farmer Collaboration Hub
        </CardTitle>

        <p className="text-sm text-muted-foreground">
          Connect, share knowledge, and learn from fellow farmers worldwide
        </p>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-4">
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="share">Share</TabsTrigger>
            <TabsTrigger value="experts">Experts</TabsTrigger>
            <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="space-y-4 pt-3">
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "All Posts" },
                { value: "success", label: "Success Stories" },
                { value: "question", label: "Questions" },
                { value: "tip", label: "Tips & Tricks" },
                { value: "problem", label: "Problems & Alerts" },
              ].map((category) => (
                <Button
                  key={category.value}
                  size="sm"
                  variant={
                    selectedCategory === category.value
                      ? "default"
                      : "outline"
                  }
                  onClick={() => setSelectedCategory(category.value)}
                >
                  {category.label}
                </Button>
              ))}
            </div>

            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search posts, farmers, or locations..."
              aria-label="Search community posts"
            />

            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  className="min-w-0 transition-shadow hover:shadow-md"
                >
                  <CardContent className="p-4">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                          {post.farmer.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-semibold">
                              {post.farmer}
                            </h4>

                            {post.verified && (
                              <CheckCircle className="h-4 w-4 text-blue-500" />
                            )}

                            {post.isMine && (
                              <Badge variant="outline">Your post</Badge>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground sm:text-sm">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span>{post.location}</span>
                            <span>•</span>
                            <Calendar className="h-3 w-3 shrink-0" />
                            <span>{post.timestamp}</span>
                          </div>
                        </div>
                      </div>

                      <Badge className={categoryColors[post.category]}>
                        {categoryIcon(post.category)}
                        <span className="ml-1 capitalize">
                          {post.category}
                        </span>
                      </Badge>
                    </div>

                    {editingPostId === post.id ? (
                      <div className="mb-3 space-y-2">
                        <Textarea
                          value={editPostDraft}
                          onChange={(event) =>
                            setEditPostDraft(event.target.value)
                          }
                          rows={4}
                          aria-label="Edit your post"
                        />

                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveEditPost(post.id)}
                            disabled={!editPostDraft.trim()}
                          >
                            <Save className="mr-1 h-4 w-4" />
                            Save changes
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingPostId(null);
                              setEditPostDraft("");
                            }}
                          >
                            <X className="mr-1 h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <p className="mb-3 whitespace-pre-wrap break-words text-sm leading-relaxed">
                        {post.content}
                      </p>
                    )}

                    {post.images.length > 0 && (
                      <div className="mb-3 grid grid-cols-2 gap-2">
                        {post.images.map((image, index) =>
                          image.startsWith("data:image/") ? (
                            <img
                              key={`${post.id}-${index}`}
                              src={image}
                              alt={
                                post.attachmentNames?.[index] ||
                                `Attachment ${index + 1}`
                              }
                              className="h-36 w-full rounded-lg border object-cover"
                            />
                          ) : (
                            <a
                              key={`${post.id}-${index}`}
                              href={image}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-2 rounded-lg border p-3 text-sm text-primary underline"
                            >
                              <ExternalLink className="h-4 w-4" />
                              {post.attachmentNames?.[index] ||
                                `Open attachment ${index + 1}`}
                            </a>
                          ),
                        )}
                      </div>
                    )}

                    {post.isMine && editingPostId !== post.id && (
                      <div className="mb-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => startEditPost(post)}
                        >
                          <Pencil className="mr-1 h-4 w-4" />
                          Edit post
                        </Button>

                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deletePost(post)}
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete post
                        </Button>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
                      <div className="flex flex-wrap items-center gap-1 sm:gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleLike(post.id)}
                          aria-pressed={post.liked}
                          className={post.liked ? "text-primary" : ""}
                        >
                          <ThumbsUp
                            className={`mr-1 h-4 w-4 ${
                              post.liked ? "fill-current" : ""
                            }`}
                          />
                          {post.liked ? "Liked" : "Like"} ({post.likes})
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openComments(post)}
                        >
                          <MessageSquare className="mr-1 h-4 w-4" />
                          {post.comments.length}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void handleShare(post)}
                        >
                          <Share2 className="mr-1 h-4 w-4" />
                          {post.shares}
                        </Button>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openComments(post)}
                        aria-label={`View post and comments, ${post.views} views`}
                      >
                        <Eye className="mr-1 h-4 w-4" />
                        {post.views}
                      </Button>
                    </div>

                    {selectedPostId === post.id && (
                      <div className="mt-4 space-y-3 border-t pt-4">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="font-semibold">Comments</h4>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedPostId(null);
                              setCommentDraft("");
                              setEditingCommentId(null);
                              setEditCommentDraft("");
                            }}
                            aria-label="Close comments"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>

                        {post.comments.length === 0 && (
                          <p className="text-sm text-muted-foreground">
                            No comments yet. Start the conversation.
                          </p>
                        )}

                        {post.comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="rounded-lg bg-muted/50 p-3"
                          >
                            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-sm font-semibold">
                                  {comment.author}
                                </span>

                                {comment.isMine && (
                                  <Badge variant="outline">Yours</Badge>
                                )}
                              </div>

                              <span className="text-xs text-muted-foreground">
                                {comment.timestamp}
                              </span>
                            </div>

                            {editingCommentId === comment.id ? (
                              <div className="space-y-2">
                                <Textarea
                                  value={editCommentDraft}
                                  onChange={(event) =>
                                    setEditCommentDraft(event.target.value)
                                  }
                                  rows={2}
                                  aria-label="Edit your comment"
                                />

                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      saveEditComment(post.id, comment.id)
                                    }
                                    disabled={!editCommentDraft.trim()}
                                  >
                                    <Save className="mr-1 h-3 w-3" />
                                    Save
                                  </Button>

                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingCommentId(null);
                                      setEditCommentDraft("");
                                    }}
                                  >
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="whitespace-pre-wrap break-words text-sm">
                                {comment.content}
                              </p>
                            )}

                            <div className="mt-2 flex flex-wrap items-center gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  likeComment(post.id, comment.id)
                                }
                                aria-pressed={Boolean(comment.liked)}
                                className={
                                  comment.liked ? "text-primary" : ""
                                }
                              >
                                <ThumbsUp
                                  className={`mr-1 h-3 w-3 ${
                                    comment.liked ? "fill-current" : ""
                                  }`}
                                />
                                {comment.likes}
                              </Button>

                              {comment.isMine &&
                                editingCommentId !== comment.id && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() =>
                                        startEditComment(comment)
                                      }
                                    >
                                      <Pencil className="mr-1 h-3 w-3" />
                                      Edit
                                    </Button>

                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-destructive hover:text-destructive"
                                      onClick={() =>
                                        deleteComment(post.id, comment)
                                      }
                                    >
                                      <Trash2 className="mr-1 h-3 w-3" />
                                      Delete
                                    </Button>
                                  </>
                                )}
                            </div>
                          </div>
                        ))}

                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Textarea
                            value={commentDraft}
                            onChange={(event) =>
                              setCommentDraft(event.target.value)
                            }
                            placeholder="Write a helpful comment..."
                            rows={2}
                          />

                          <Button
                            className="sm:self-end"
                            onClick={handleComment}
                            disabled={!commentDraft.trim()}
                          >
                            <Send className="mr-1 h-4 w-4" />
                            Comment
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}

              {filteredPosts.length === 0 && (
                <div className="rounded-lg border border-dashed p-8 text-center">
                  <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                  <p className="font-medium">No matching posts</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Try another category or search term, or create a new post.
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="share" className="space-y-4 pt-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Share Your Experience
                </CardTitle>

                <p className="text-sm text-muted-foreground">
                  Share a farming experience, ask a question, or help other
                  farmers.
                </p>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="community-author">Your name</Label>
                    <Input
                      id="community-author"
                      value={author}
                      onChange={(event) => setAuthor(event.target.value)}
                      placeholder="Enter your name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="community-location">Location</Label>
                    <Input
                      id="community-location"
                      value={location}
                      onChange={(event) => setLocation(event.target.value)}
                      placeholder="Village, district, state"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="community-category">Post category</Label>

                  <select
                    id="community-category"
                    value={newCategory}
                    onChange={(event) =>
                      setNewCategory(event.target.value as Category)
                    }
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="success">Success Story</option>
                    <option value="question">Question</option>
                    <option value="tip">Tip & Trick</option>
                    <option value="problem">Problem / Alert</option>
                  </select>
                </div>

                <Textarea
                  value={newPost}
                  onChange={(event) => setNewPost(event.target.value)}
                  placeholder="What's happening on your farm? Include the crop, symptoms, location, or useful details..."
                  rows={5}
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => handleFiles(event, true)}
                />

                <input
                  ref={documentInputRef}
                  type="file"
                  accept="image/*,.pdf,.txt,text/plain,application/pdf"
                  multiple
                  className="hidden"
                  onChange={(event) => handleFiles(event, false)}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="mr-1 h-4 w-4" />
                    Photo
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => documentInputRef.current?.click()}
                  >
                    <Upload className="mr-1 h-4 w-4" />
                    Document
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={getLocation}
                  >
                    <MapPin className="mr-1 h-4 w-4" />
                    Add Location
                  </Button>
                </div>

                {attachmentNames.length > 0 && (
                  <div className="space-y-2 rounded-lg border p-3">
                    <p className="text-sm font-medium">Attachments</p>

                    {attachmentNames.map((name, index) => (
                      <div
                        key={`${name}-${index}`}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="break-all">{name}</span>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setAttachments((current) =>
                              current.filter((_, i) => i !== index),
                            );

                            setAttachmentNames((current) =>
                              current.filter((_, i) => i !== index),
                            );
                          }}
                          aria-label={`Remove ${name}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={submitPost}
                  disabled={!newPost.trim()}
                  className="w-full sm:w-auto"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Share Post
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Quick Post Templates
                </CardTitle>
              </CardHeader>

              <CardContent className="grid gap-3 sm:grid-cols-2">
                {templates.map((template) => (
                  <Button
                    key={template.title}
                    variant="outline"
                    className="h-auto justify-start whitespace-normal p-3 text-left"
                    onClick={() => {
                      setNewCategory(template.category);
                      setNewPost(template.text);
                    }}
                  >
                    <span className="mr-2 text-xl">{template.icon}</span>

                    <span>
                      <span className="block font-medium">
                        {template.title}
                      </span>

                      <span className="mt-1 block text-xs text-muted-foreground">
                        Use this template to start a post
                      </span>
                    </span>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="experts" className="space-y-4 pt-3">
            <div className="grid gap-4">
              {experts.map((expert) => (
                <Card key={expert.name}>
                  <CardContent className="flex flex-col justify-between gap-4 p-4 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-r from-blue-500 to-purple-500 font-bold text-white">
                        {expert.name.charAt(0)}
                      </div>

                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="font-semibold">
                            {expert.name}
                          </h4>

                          {expert.verified && (
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground">
                          {expert.expertise}
                        </p>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500" />
                            {expert.rating}
                          </span>

                          <span>
                            {expert.consultations} consultations
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      onClick={() => contactExpert(expert)}
                    >
                      Contact Expert
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <p className="text-xs text-muted-foreground">
              Expert profiles shown here are sample entries. Contact opens
              your configured email app; verified contact details need to
              be added before this is used as a live expert directory.
            </p>
          </TabsContent>

          <TabsContent value="leaderboard" className="space-y-4 pt-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Top Contributors
                </CardTitle>
              </CardHeader>

              <CardContent className="space-y-3">
                {[
                  {
                    name: "Suresh Patel",
                    points: 2847,
                    posts: 23,
                    location: "Gujarat",
                  },
                  {
                    name: "Rajesh Kumar",
                    points: 2234,
                    posts: 18,
                    location: "Punjab",
                  },
                  {
                    name: "Priya Sharma",
                    points: 1923,
                    posts: 15,
                    location: "Maharashtra",
                  },
                  {
                    name: "Anita Reddy",
                    points: 1756,
                    posts: 19,
                    location: "Andhra Pradesh",
                  },
                  {
                    name: "Mohan Singh",
                    points: 1543,
                    posts: 12,
                    location: "Haryana",
                  },
                ].map((farmer, index) => (
                  <div
                    key={farmer.name}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-bold text-white ${
                          index === 0
                            ? "bg-yellow-500"
                            : index === 1
                              ? "bg-gray-500"
                              : index === 2
                                ? "bg-orange-600"
                                : "bg-blue-500"
                        }`}
                      >
                        {index + 1}
                      </div>

                      <div className="min-w-0">
                        <p className="font-semibold">{farmer.name}</p>

                        <p className="text-xs text-muted-foreground">
                          {farmer.location} · {farmer.posts} posts
                        </p>
                      </div>
                    </div>

                    <p className="shrink-0 font-bold text-primary">
                      {farmer.points.toLocaleString()} pts
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Achievement Badges</CardTitle>
              </CardHeader>

              <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["🏆", "Top Helper", "Helpful answers"],
                  ["🌟", "Rising Star", "Growing contributor"],
                  ["📚", "Knowledge Guru", "Useful farming knowledge"],
                  ["🤝", "Community Builder", "Active participation"],
                  ["🔬", "Innovation Pioneer", "New techniques"],
                  ["🌱", "Green Thumb", "Sustainable practices"],
                  ["📈", "Success Coach", "Sharing results"],
                  ["🎯", "Problem Solver", "Helping solve problems"],
                ].map(([icon, title, description]) => (
                  <div
                    key={title}
                    className="rounded-lg border p-3 text-center"
                  >
                    <div className="mb-1 text-2xl">{icon}</div>
                    <p className="text-sm font-medium">{title}</p>
                    <p className="text-xs text-muted-foreground">
                      {description}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};