import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Bell, CheckCircle2, Clock, UserPlus, Check, Inbox } from 'lucide-react';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { 
  useListNotifications, 
  useMarkAllNotificationsRead, 
  useMarkNotificationRead,
  getListNotificationsQueryKey,
  NotificationType
} from '@workspace/api-client-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function Notifications() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('all');

  const { data: notifications, isLoading } = useListNotifications(
    { unreadOnly: activeTab === 'unread' ? true : undefined },
    { query: { queryKey: getListNotificationsQueryKey({ unreadOnly: activeTab === 'unread' ? true : undefined }) } }
  );

  const markAllReadMutation = useMarkAllNotificationsRead({
    mutation: {
      onSuccess: () => {
        toast.success('All notifications marked as read');
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    }
  });

  const markReadMutation = useMarkNotificationRead({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
      }
    }
  });

  const getIcon = (type: NotificationType) => {
    switch (type) {
      case 'deadline': return <Clock className="h-4 w-4 text-amber-500" />;
      case 'assignment': return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'completion': return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      default: return <Bell className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const handleMarkAllRead = () => {
    markAllReadMutation.mutate({});
  };

  const handleNotificationClick = (id: number, isRead: boolean) => {
    if (!isRead) {
      markReadMutation.mutate({ id });
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-border/40">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground mt-1">Stay updated on your agency's activity.</p>
        </div>
        <Button 
          variant="outline" 
          onClick={handleMarkAllRead}
          disabled={markAllReadMutation.isPending || !notifications?.some(n => !n.read)}
          className="gap-2"
        >
          <Check className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-[400px] grid-cols-2">
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">Unread</TabsTrigger>
        </TabsList>
        
        <TabsContent value={activeTab} className="mt-6 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-4 flex gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </Card>
              ))}
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed border-border/50">
              <Inbox className="h-10 w-10 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground">No notifications</h3>
              <p className="text-muted-foreground text-sm">
                {activeTab === 'unread' ? "You're all caught up! No new notifications." : "Your notification history is empty."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={cn(
                    "p-4 cursor-pointer transition-all hover:bg-muted/50 border",
                    !notification.read ? "bg-primary/5 border-l-4 border-l-primary" : "border-border/50 shadow-sm"
                  )}
                  onClick={() => handleNotificationClick(notification.id, notification.read)}
                >
                  <div className="flex gap-4">
                    <div className={cn(
                      "mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      !notification.read ? "bg-background shadow-sm" : "bg-muted"
                    )}>
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-start">
                        <h4 className={cn("text-sm font-medium", !notification.read ? "text-foreground" : "text-muted-foreground")}>
                          {notification.title}
                        </h4>
                        <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className={cn("text-sm", !notification.read ? "text-foreground/90" : "text-muted-foreground")}>
                        {notification.message}
                      </p>
                    </div>
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}