import { Button } from "../../ui/button";

type VideoFiltersProps = {
  chips: string[];
  onChipSelect: (chip: string) => void;
};

export function VideoFilters({ chips, onChipSelect }: VideoFiltersProps) {
  return (
    <div className="flex gap-2 overflow-auto pb-1 md:hidden">
      {chips.map((chip) => (
        <Button
          key={chip}
          variant="outline"
          size="sm"
          className="whitespace-nowrap"
          onClick={() => onChipSelect(chip)}
        >
          {chip}
        </Button>
      ))}
    </div>
  );
}
