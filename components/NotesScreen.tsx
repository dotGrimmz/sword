import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Plus, Search, Edit, Trash2, Calendar, BookOpen } from "lucide-react";
import { motion } from "motion/react";

interface NotesScreenProps {
  onNavigate: (screen: string) => void;
}

interface Note {
  id: string;
  title: string;
  content: string;
  verse: string;
  reference: string;
  date: string;
  tags: string[];
}

export function NotesScreen({ onNavigate }: NotesScreenProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  const [notes] = useState<Note[]>([
    {
      id: "1",
      title: "Blessed are those who mourn",
      content: "This verse has touched my heart deeply. The idea that mourning leads to comfort shows God's compassion for our pain. I think this applies not just to grief over death, but mourning over sin and brokenness in the world.",
      verse: "Blessed are those who mourn, for they shall be comforted.",
      reference: "Matthew 5:4",
      date: "Oct 5, 2024",
      tags: ["comfort", "blessing", "mourning"]
    },
    {
      id: "2",
      title: "God's plans for prosperity",
      content: "This promise reminds me that even in difficult seasons, God has good plans. The Hebrew word for 'prosper' (shalom) means wholeness and peace, not necessarily material wealth.",
      verse: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you...",
      reference: "Jeremiah 29:11",
      date: "Oct 3, 2024",
      tags: ["plans", "hope", "future"]
    },
    {
      id: "3",
      title: "Love your enemies",
      content: "This is one of the hardest commands to follow. Jesus calls us to a radical love that goes beyond human nature. Only through His Spirit can we truly love those who hurt us.",
      verse: "But I say to you, Love your enemies and pray for those who persecute you",
      reference: "Matthew 5:44",
      date: "Oct 1, 2024",
      tags: ["love", "enemies", "prayer"]
    }
  ]);

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.reference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-hidden bg-gradient-to-b from-background to-secondary/10">
      {/* Header */}
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl text-primary">Study Notes</h1>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-1" />
                New Note
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Note</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Note title..." className="bg-input-background border-border/50" />
                <Input placeholder="Scripture reference (e.g., John 3:16)" className="bg-input-background border-border/50" />
                <Textarea 
                  placeholder="Your thoughts and reflections..." 
                  className="bg-input-background border-border/50 min-h-[120px]"
                />
                <Input placeholder="Tags (comma separated)" className="bg-input-background border-border/50" />
                <Button 
                  className="w-full bg-primary hover:bg-primary/90"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Save Note
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search your notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-input-background border-border/50"
          />
        </div>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-4 pb-20 space-y-4">
        {filteredNotes.map((note, index) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <Card className="border-border/50 bg-card/80 hover:shadow-md transition-all duration-200">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base text-foreground mb-1">{note.title}</CardTitle>
                    <CardDescription className="flex items-center space-x-4 text-xs">
                      <span className="flex items-center space-x-1">
                        <BookOpen className="w-3 h-3" />
                        <span>{note.reference}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>{note.date}</span>
                      </span>
                    </CardDescription>
                  </div>
                  <div className="flex space-x-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Edit className="w-3 h-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <blockquote className="scripture-text text-sm italic text-muted-foreground border-l-2 border-accent pl-3">
                  "{note.verse}"
                </blockquote>
                <p className="text-sm text-foreground leading-relaxed">
                  {note.content}
                </p>
                <div className="flex flex-wrap gap-1">
                  {note.tags.map((tag) => (
                    <span 
                      key={tag}
                      className="px-2 py-1 bg-accent/20 text-accent text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}