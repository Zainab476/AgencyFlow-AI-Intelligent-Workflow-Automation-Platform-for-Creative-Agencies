import { Badge } from "@/components/ui/badge";
import { ProjectStatus } from "@workspace/api-client-react";

interface ProjectStatusBadgeProps {
  status: ProjectStatus | string;
}

export function ProjectStatusBadge({ status }: ProjectStatusBadgeProps) {
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'planning':
        return 'bg-slate-500 hover:bg-slate-600 text-white';
      case 'active':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'on_hold':
        return 'bg-amber-500 hover:bg-amber-600 text-white';
      case 'completed':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'cancelled':
        return 'bg-red-500 hover:bg-red-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

  const getStatusLabel = (status: string) => {
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <Badge className={`font-medium border-0 ${getBadgeVariant(status)}`}>
      {getStatusLabel(status)}
    </Badge>
  );
}