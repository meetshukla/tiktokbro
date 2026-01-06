'use client';

import { useState, useMemo } from 'react';
import { useReactionContext } from '@/context/ReactionContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Play, Clock, ArrowRight, Check } from 'lucide-react';
import Image from 'next/image';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function ReactionLibrary() {
  const { state, selectCategory, selectReaction, generateImages } = useReactionContext();
  const { reactions, categories, selectedCategory, session, isLoading } = state;
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const filteredReactions = useMemo(() => {
    let filtered = reactions;

    if (selectedCategory) {
      filtered = filtered.filter((r) => r.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) => r.name.toLowerCase().includes(query) || r.description?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [reactions, selectedCategory, searchQuery]);

  const handleSelectReaction = async (reactionId: string) => {
    await selectReaction(reactionId);
  };

  const handleContinue = async () => {
    await generateImages();
  };

  const isSelected = (reactionId: string) => session?.selectedReactionId === reactionId;

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {categories.length > 0 && (
          <Tabs
            value={selectedCategory || 'all'}
            onValueChange={(v) => selectCategory(v === 'all' ? null : v)}
          >
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              {categories.slice(0, 4).map((cat) => (
                <TabsTrigger key={cat} value={cat} className="capitalize">
                  {cat}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}
      </div>

      {/* Reactions Grid */}
      {filteredReactions.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredReactions.map((reaction) => (
            <div
              key={reaction.reactionId}
              className={`
                relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all duration-200
                ${
                  isSelected(reaction.reactionId)
                    ? 'border-primary ring-2 ring-primary/20'
                    : 'border-transparent hover:border-primary/50'
                }
              `}
              onClick={() => handleSelectReaction(reaction.reactionId)}
              onMouseEnter={() => setHoveredId(reaction.reactionId)}
              onMouseLeave={() => setHoveredId(null)}
            >
              <div className="aspect-[9/16] relative bg-muted">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`${API_URL}${reaction.firstFrameUrl}`}
                  alt={reaction.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />

                {/* Hover overlay */}
                <div
                  className={`
                  absolute inset-0 bg-black/50 flex items-center justify-center transition-opacity
                  ${hoveredId === reaction.reactionId ? 'opacity-100' : 'opacity-0'}
                `}
                >
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Play className="w-6 h-6 text-white fill-white" />
                  </div>
                </div>

                {/* Selected indicator */}
                {isSelected(reaction.reactionId) && (
                  <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}

                {/* Duration badge */}
                <div className="absolute bottom-2 right-2">
                  <Badge variant="secondary" className="bg-black/60 text-white border-0 text-xs">
                    <Clock className="w-3 h-3 mr-1" />
                    {reaction.duration}s
                  </Badge>
                </div>
              </div>

              <div className="p-3 bg-card">
                <h3 className="font-medium text-sm truncate">{reaction.name}</h3>
                <Badge variant="outline" className="text-xs mt-1 capitalize">
                  {reaction.category}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {reactions.length === 0
              ? 'No reactions in library yet. Add some to get started!'
              : 'No reactions match your search.'}
          </p>
        </div>
      )}

      {/* Continue Button */}
      {session?.selectedReactionId && (
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleContinue} disabled={isLoading} size="lg">
            Generate Avatar Images
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
}
