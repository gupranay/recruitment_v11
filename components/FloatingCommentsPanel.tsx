"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import Image from "next/image";
import { MessageSquare, X, User, Trash2, Edit2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  user_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at?: string;
  round_name: string | null;
  source: string | null;
  is_edited?: boolean;
}

interface FloatingCommentsPanelProps {
  comments: Comment[];
  isOpen: boolean;
  onToggle: () => void;
  onCommentClick?: (commentId: string) => void;
  currentUserId?: string;
  isOwnerOrAdmin?: boolean;
  onDeleteComment?: (commentId: string) => void;
}

export default function FloatingCommentsPanel({
  comments,
  isOpen,
  onToggle,
  onCommentClick,
  currentUserId,
  isOwnerOrAdmin,
  onDeleteComment,
}: FloatingCommentsPanelProps) {
  const handleDeleteClick = (e: React.MouseEvent, commentId: string) => {
    e.stopPropagation();
    onDeleteComment?.(commentId);
  };

  return (
    <>
      {/* Toggle Button */}
      <Button
        onClick={onToggle}
        variant="default"
        size="lg"
        className={cn(
          "fixed bottom-6 right-6 z-40 rounded-full h-16 w-16 p-0 shadow-xl hover:shadow-2xl transition-all duration-200 hover:scale-105",
          isOpen && "hidden"
        )}
        aria-label="View comments"
      >
        <MessageSquare className="h-6 w-6" />
        {comments.length > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-1 -right-1 h-6 w-6 flex items-center justify-center p-0 text-xs font-semibold"
          >
            {comments.length}
          </Badge>
        )}
      </Button>

      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full w-[600px] bg-card border-l shadow-xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Panel Header */}
        <div className="border-b px-4 py-3 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-semibold text-sm">Comments</h3>
            {comments.length > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {comments.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="h-8 w-8 p-0"
            aria-label="Close comments panel"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Comments List */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {comments.length > 0 ? (
              comments.map((comment, index) => (
                <Card
                  key={comment.id ?? `comment-${index}`}
                  className="group hover:bg-muted/50 transition-colors"
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      {comment.avatar_url ? (
                        <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 ring-1 ring-border">
                          <Image
                            src={comment.avatar_url}
                            alt={comment.user_name || "User"}
                            width={24}
                            height={24}
                            className="object-cover w-full h-full"
                          />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <User className="h-3 w-3 text-primary" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-medium text-sm text-card-foreground">
                            {comment.user_name || "Anonymous"}
                          </span>
                          {comment.round_name && (
                            <Badge variant="outline" className="text-xs h-4 px-1">
                              {comment.round_name}
                            </Badge>
                          )}
                        </div>
                        <div
                          className="text-xs text-foreground rich-text-content prose prose-sm max-w-none break-words overflow-wrap-anywhere"
                          dangerouslySetInnerHTML={{
                            __html: comment.comment_text,
                          }}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                        {comment.user_id === currentUserId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              onCommentClick?.(comment.id);
                            }}
                            title="Edit comment"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {(comment.user_id === currentUserId || isOwnerOrAdmin) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={(e) => handleDeleteClick(e, comment.id)}
                            title="Delete comment"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="h-8 w-8 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">
                  No comments yet
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40"
          onClick={onToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
}
