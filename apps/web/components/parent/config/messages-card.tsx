import { Card, CardContent, CardHeader, CardTitle } from "../../ui/card";
import { Input } from "../../ui/input";
import { Textarea } from "../../ui/textarea";

type MessagesCardProps = {
  welcomeMessage: string;
  coachMessage: string;
  onSetWelcomeMessage: (value: string) => void;
  onSetCoachMessage: (value: string) => void;
};

export function MessagesCard({ welcomeMessage, coachMessage, onSetWelcomeMessage, onSetCoachMessage }: MessagesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Messages</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-muted-foreground">
        <div>
          <p className="mb-2 font-medium text-foreground">Welcome Message</p>
          <Input placeholder="Welcome to PH Performance..." value={welcomeMessage} onChange={(event) => onSetWelcomeMessage(event.target.value)} />
        </div>
        <div>
          <p className="mb-2 font-medium text-foreground">Coach Message</p>
          <Textarea placeholder="Share how parents can reach their coach." value={coachMessage} onChange={(event) => onSetCoachMessage(event.target.value)} />
        </div>
      </CardContent>
    </Card>
  );
}
