import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, RotateCw } from "lucide-react";

interface Flashcard {
  question: string;
  answer: string;
}

interface FlashcardDeckProps {
  cards: Flashcard[];
}

export const FlashcardDeck = ({ cards }: FlashcardDeckProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (cards.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No flashcards generated yet
      </div>
    );
  }

  const currentCard = cards[currentIndex];

  const handleNext = () => {
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsFlipped(false);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsFlipped(false);
    }
  };

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          Card {currentIndex + 1} of {cards.length}
        </h3>
        <Button variant="outline" size="sm" onClick={handleFlip}>
          <RotateCw className="h-4 w-4 mr-2" />
          Flip Card
        </Button>
      </div>

      <div className="perspective-1000">
        <Card
          className={`relative min-h-[300px] p-8 cursor-pointer transition-all duration-500 transform-style-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={handleFlip}
        >
          <div className={`${isFlipped ? 'hidden' : 'block'}`}>
            <div className="flex items-center justify-center h-full min-h-[250px]">
              <div className="text-center space-y-4">
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                  Question
                </span>
                <p className="text-xl font-medium">{currentCard.question}</p>
              </div>
            </div>
          </div>

          <div className={`${isFlipped ? 'block' : 'hidden'}`}>
            <div className="flex items-center justify-center h-full min-h-[250px]">
              <div className="text-center space-y-4">
                <span className="text-xs font-semibold text-secondary uppercase tracking-wide">
                  Answer
                </span>
                <p className="text-lg">{currentCard.answer}</p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex items-center justify-center gap-4">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>
        <Button
          variant="outline"
          onClick={handleNext}
          disabled={currentIndex === cards.length - 1}
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};
