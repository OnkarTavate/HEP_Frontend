import { ArrowRight, Users } from "lucide-react";
import {
  Card,
  CardAction,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function ReportCard({ report }) {
  return (
    <a href={`/admin/reports/${report.slug}`}>
      <Card
        size="sm"
        className="h-full cursor-pointer transition-colors hover:bg-orange-50 dark:hover:bg-orange-500/10"
      >
        <CardHeader>
          <Users className="mb-1 h-6 w-6 text-orange-500" />
          <CardTitle className="text-sm">{report.title}</CardTitle>
          <CardDescription>{report.description}</CardDescription>
          <CardAction>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardAction>
        </CardHeader>
      </Card>
    </a>
  );
}
