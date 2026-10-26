
import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  Clock,
  MessageCircle,
  Plus,
  TrendingUp,
  Users,
  Vote,
  Wheat,
  Undo2,
} from "lucide-react";

interface Poll {
  id: string;
  title: string;
  description: string;
  category: "crop_selection" | "pricing" | "technique" | "market_trend";
  status: "active" | "completed" | "upcoming";
  creator: string;
  createdAt: string;
  endDate: string;
  totalVotes: number;
  options: {
    id: string;
    text: string;
    votes: number;
    percentage: number;
  }[];
  userVoted?: string;
  region: string;
}

const today = new Date();

const dateAfterDays = (days: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

const initialPolls: Poll[] = [
  {
    id: "1",
    title: "Best Crop for Rabi Season 2026",
    description:
      "Help fellow farmers decide which crop has the best potential for the upcoming Rabi season based on market trends and weather predictions.",
    category: "crop_selection",
    status: "active",
    creator: "Agricultural Expert Dr. Patel",
    createdAt: dateAfterDays(-5),
    endDate: dateAfterDays(10),
    totalVotes: 234,
    options: [
      { id: "1a", text: "Wheat", votes: 89, percentage: 38 },
      { id: "1b", text: "Barley", votes: 56, percentage: 24 },
      { id: "1c", text: "Chickpea", votes: 67, percentage: 29 },
      { id: "1d", text: "Mustard", votes: 22, percentage: 9 },
    ],
    region: "Maharashtra",
  },
  {
    id: "2",
    title: "Fair Price for Tomatoes This Season",
    description:
      "What do you think is a fair price for tomatoes considering current market conditions?",
    category: "pricing",
    status: "active",
    creator: "Farmers Collective Pune",
    createdAt: dateAfterDays(-3),
    endDate: dateAfterDays(7),
    totalVotes: 156,
    options: [
      { id: "2a", text: "₹20-25 per kg", votes: 62, percentage: 40 },
      { id: "2b", text: "₹25-30 per kg", votes: 47, percentage: 30 },
      { id: "2c", text: "₹30-35 per kg", votes: 31, percentage: 20 },
      { id: "2d", text: "Above ₹35 per kg", votes: 16, percentage: 10 },
    ],
    userVoted: "2a",
    region: "Maharashtra",
  },
  {
    id: "3",
    title: "Most Effective Organic Fertilizer",
    description:
      "Share your experience with organic fertilizers. Which one has given you the best results?",
    category: "technique",
    status: "active",
    creator: "Green Farming Initiative",
    createdAt: dateAfterDays(-2),
    endDate: dateAfterDays(14),
    totalVotes: 89,
    options: [
      { id: "3a", text: "Vermicompost", votes: 34, percentage: 38 },
      { id: "3b", text: "FYM (Farm Yard Manure)", votes: 28, percentage: 31 },
      { id: "3c", text: "Compost", votes: 19, percentage: 21 },
      { id: "3d", text: "Bio-fertilizer", votes: 8, percentage: 9 },
    ],
    region: "All India",
  },
  {
    id: "4",
    title: "Cotton Market Outlook",
    description:
      "How do you see the cotton market performing in the next 6 months?",
    category: "market_trend",
    status: "completed",
    creator: "Cotton Association of India",
    createdAt: dateAfterDays(-30),
    endDate: dateAfterDays(-10),
    totalVotes: 412,
    options: [
      { id: "4a", text: "Prices will increase", votes: 165, percentage: 40 },
      { id: "4b", text: "Prices will remain stable", votes: 124, percentage: 30 },
      { id: "4c", text: "Prices will decrease", votes: 82, percentage: 20 },
      { id: "4d", text: "Uncertain/Volatile", votes: 41, percentage: 10 },
    ],
    userVoted: "4a",
    region: "All India",
  },
];

const formatDate = (dateString: string) => {
  return new Date(dateString + "T00:00:00").toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getPollStatus = (poll: Poll): Poll["status"] => {
  if (poll.status === "completed") return "completed";

  const now = new Date();
  const end = new Date(poll.endDate + "T23:59:59");

  if (end < now) return "completed";
  if (new Date(poll.createdAt + "T00:00:00") > now) return "upcoming";

  return "active";
};

const updatePercentages = (
  options: Poll["options"],
  totalVotes: number
): Poll["options"] => {
  return options.map((option) => ({
    ...option,
    percentage:
      totalVotes === 0
        ? 0
        : Math.round((option.votes / totalVotes) * 100),
  }));
};

const Polls = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [polls, setPolls] = useState<Poll[]>(initialPolls);
  const [showCreatePoll, setShowCreatePoll] = useState(false);
  const [newPoll, setNewPoll] = useState({
    title: "",
    description: "",
    category: "crop_selection" as Poll["category"],
    options: ["", ""],
    endDate: "",
  });

  const user = {
    name: "John Farmer",
    role: "farmer",
  };

  const categoryColors = {
    crop_selection: "bg-green-100 text-green-700",
    pricing: "bg-blue-100 text-blue-700",
    technique: "bg-purple-100 text-purple-700",
    market_trend: "bg-orange-100 text-orange-700",
  };

  const categoryIcons = {
    crop_selection: Wheat,
    pricing: TrendingUp,
    technique: CheckCircle,
    market_trend: MessageCircle,
  };

  // Cast a vote for an active poll.
  const handleVote = (pollId: string, optionId: string) => {
    setPolls((currentPolls) =>
      currentPolls.map((poll) => {
        if (
          poll.id !== pollId ||
          poll.userVoted ||
          getPollStatus(poll) !== "active" ||
          !poll.options.some((option) => option.id === optionId)
        ) {
          return poll;
        }

        const updatedOptions = poll.options.map((option) => ({
          ...option,
          votes: option.votes + (option.id === optionId ? 1 : 0),
        }));

        const totalVotes = poll.totalVotes + 1;

        return {
          ...poll,
          userVoted: optionId,
          totalVotes,
          options: updatePercentages(updatedOptions, totalVotes),
        };
      })
    );
  };

  // Remove the current user's vote.
  const handleUndoVote = (pollId: string) => {
    setPolls((currentPolls) =>
      currentPolls.map((poll) => {
        if (
          poll.id !== pollId ||
          !poll.userVoted ||
          getPollStatus(poll) !== "active"
        ) {
          return poll;
        }

        const votedOptionId = poll.userVoted;
        const updatedOptions = poll.options.map((option) => ({
          ...option,
          votes:
            option.id === votedOptionId
              ? Math.max(0, option.votes - 1)
              : option.votes,
        }));

        const totalVotes = Math.max(0, poll.totalVotes - 1);

        return {
          ...poll,
          userVoted: undefined,
          totalVotes,
          options: updatePercentages(updatedOptions, totalVotes),
        };
      })
    );
  };

  const handleCreatePoll = () => {
    const title = newPoll.title.trim();
    const description = newPoll.description.trim();
    const options = newPoll.options
      .map((option) => option.trim())
      .filter(Boolean);

    if (!title || !description || options.length < 2 || !newPoll.endDate) {
      alert("Please fill in all fields and provide at least two options.");
      return;
    }

    const todayString = dateAfterDays(0);

    if (newPoll.endDate < todayString) {
      alert("Please select a future end date.");
      return;
    }

    const timestamp = Date.now();

    const poll: Poll = {
      id: timestamp.toString(),
      title,
      description,
      category: newPoll.category,
      status: "active",
      creator: user.name,
      createdAt: todayString,
      endDate: newPoll.endDate,
      totalVotes: 0,
      options: options.map((text, index) => ({
        id: `${timestamp}-${index}`,
        text,
        votes: 0,
        percentage: 0,
      })),
      region: "All India",
    };

    setPolls((current) => [poll, ...current]);
    setShowCreatePoll(false);
    setNewPoll({
      title: "",
      description: "",
      category: "crop_selection",
      options: ["", ""],
      endDate: "",
    });
  };

  const addOption = () => {
    if (newPoll.options.length < 6) {
      setNewPoll((current) => ({
        ...current,
        options: [...current.options, ""],
      }));
    }
  };

  const updateOption = (index: number, value: string) => {
    setNewPoll((current) => ({
      ...current,
      options: current.options.map((option, i) =>
        i === index ? value : option
      ),
    }));
  };

  const removeOption = (index: number) => {
    if (newPoll.options.length > 2) {
      setNewPoll((current) => ({
        ...current,
        options: current.options.filter((_, i) => i !== index),
      }));
    }
  };

  const activePolls = polls.filter(
    (poll) => getPollStatus(poll) === "active"
  );

  const completedPolls = polls.filter(
    (poll) => getPollStatus(poll) === "completed"
  );

  const myPolls = polls.filter((poll) => poll.creator === user.name);

  const renderPollCard = (poll: Poll, completed = false) => {
    const CategoryIcon = categoryIcons[poll.category];

    const winningOption = poll.options.reduce(
      (prev, current) => (prev.votes > current.votes ? prev : current),
      poll.options[0]
    );

    const hasVoted = Boolean(poll.userVoted);
    const isActive = getPollStatus(poll) === "active";

    return (
      <Card
        key={poll.id}
        className={
          completed
            ? "opacity-90"
            : "hover:shadow-lg transition-shadow"
        }
      >
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={categoryColors[poll.category]}>
                  <CategoryIcon className="h-3 w-3 mr-1" />
                  {poll.category.replace("_", " ")}
                </Badge>

                <Badge variant={completed ? "secondary" : "default"}>
                  {completed ? "Completed" : "Active"}
                </Badge>
              </div>

              <CardTitle className="text-xl">{poll.title}</CardTitle>
              <CardDescription>{poll.description}</CardDescription>
            </div>

            <div className="text-sm text-muted-foreground sm:text-right">
              <div className="flex items-center gap-1 mb-1">
                <Users className="h-4 w-4" />
                {poll.totalVotes} votes
              </div>

              <div className="flex items-center gap-1">
                {completed ? (
                  <>Ended {formatDate(poll.endDate)}</>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    Ends {formatDate(poll.endDate)}
                  </>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            By {poll.creator} • {poll.region}
          </div>

          {completed && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
              <div className="flex items-center gap-2 text-sm text-blue-700">
                <TrendingUp className="h-4 w-4" />
                <span className="font-medium">
                  Winner: {winningOption?.text}
                </span>
                <span>({winningOption?.percentage}% of votes)</span>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {poll.options.map((option) => (
              <div key={option.id} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {!completed && isActive && !hasVoted ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleVote(poll.id, option.id)}
                        aria-label={`Vote for ${option.text}`}
                      >
                        <Vote className="h-4 w-4" />
                      </Button>
                    ) : poll.userVoted === option.id ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : null}

                    <span
                      className={
                        poll.userVoted === option.id
                          ? "font-medium text-green-600"
                          : ""
                      }
                    >
                      {option.text}
                    </span>
                  </div>

                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {option.percentage}% ({option.votes})
                  </span>
                </div>

                <Progress value={option.percentage} className="h-2" />
              </div>
            ))}
          </div>

          {hasVoted && isActive && !completed && (
            <div className="space-y-3 rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle className="h-4 w-4" />
                Thank you for voting!
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleUndoVote(poll.id)}
                className="border-green-300 bg-white text-green-700 hover:bg-green-100"
              >
                <Undo2 className="mr-2 h-4 w-4" />
                Undo Vote
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header
        user={user}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        notificationCount={3}
      />

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={user.role}
      />

      <main className="p-6 md:ml-64">
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-foreground">
                Community Polls
              </h2>
              <p className="text-muted-foreground">
                Participate in agricultural discussions and community decisions
              </p>
            </div>

            <Button onClick={() => setShowCreatePoll(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Poll
            </Button>
          </div>

          {showCreatePoll && (
            <Card>
              <CardHeader>
                <CardTitle>Create New Poll</CardTitle>
                <CardDescription>
                  Start a discussion with the farming community
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Poll Title</Label>
                  <Input
                    id="title"
                    value={newPoll.title}
                    onChange={(e) =>
                      setNewPoll({ ...newPoll, title: e.target.value })
                    }
                    placeholder="Enter poll title"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newPoll.description}
                    onChange={(e) =>
                      setNewPoll({
                        ...newPoll,
                        description: e.target.value,
                      })
                    }
                    placeholder="Describe what this poll is about"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <select
                    id="category"
                    className="w-full rounded-md border bg-background p-2"
                    value={newPoll.category}
                    onChange={(e) =>
                      setNewPoll({
                        ...newPoll,
                        category: e.target.value as Poll["category"],
                      })
                    }
                  >
                    <option value="crop_selection">Crop selection</option>
                    <option value="pricing">Pricing</option>
                    <option value="technique">Technique</option>
                    <option value="market_trend">Market trend</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label>Options</Label>

                  {newPoll.options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={option}
                        onChange={(e) =>
                          updateOption(index, e.target.value)
                        }
                        placeholder={`Option ${index + 1}`}
                      />

                      {newPoll.options.length > 2 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeOption(index)}
                        >
                          Remove
                        </Button>
                      )}
                    </div>
                  ))}

                  {newPoll.options.length < 6 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addOption}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Option
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Poll end date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    min={dateAfterDays(1)}
                    value={newPoll.endDate}
                    onChange={(e) =>
                      setNewPoll({ ...newPoll, endDate: e.target.value })
                    }
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <Button onClick={handleCreatePoll}>Create Poll</Button>

                  <Button
                    variant="outline"
                    onClick={() => setShowCreatePoll(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="active" className="space-y-6">
            <TabsList>
              <TabsTrigger value="active">Active Polls</TabsTrigger>
              <TabsTrigger value="completed">Completed</TabsTrigger>
              <TabsTrigger value="my-polls">My Polls</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-6">
              <div className="grid gap-6">
                {activePolls.length > 0 ? (
                  activePolls.map((poll) => renderPollCard(poll))
                ) : (
                  <p className="text-center text-muted-foreground">
                    No active polls right now.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="completed" className="space-y-6">
              <div className="grid gap-6">
                {completedPolls.length > 0 ? (
                  completedPolls.map((poll) => renderPollCard(poll, true))
                ) : (
                  <p className="text-center text-muted-foreground">
                    No completed polls yet.
                  </p>
                )}
              </div>
            </TabsContent>

            <TabsContent value="my-polls" className="space-y-6">
              <div className="grid gap-6">
                {myPolls.length > 0 ? (
                  myPolls.map((poll) =>
                    renderPollCard(
                      poll,
                      getPollStatus(poll) === "completed"
                    )
                  )
                ) : (
                  <Card className="py-12 text-center">
                    <CardContent>
                      <Vote className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />

                      <h3 className="mb-2 text-lg font-medium">
                        No polls created yet
                      </h3>

                      <p className="mb-4 text-muted-foreground">
                        Start engaging with the community by creating your
                        first poll.
                      </p>

                      <Button onClick={() => setShowCreatePoll(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Create Your First Poll
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Polls;