import { supabase } from "@/integrations/supabase/client";

interface ActivityLogParams {
  userId: string;
  action: string;
  entityType?: string;
  entityId?: string;
  details?: Record<string, any>;
}

export const logActivity = async ({
  userId,
  action,
  entityType = "system",
  entityId,
  details = {}
}: ActivityLogParams): Promise<void> => {
  try {
    const { error } = await supabase
      .from("activity_logs")
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details
      });

    if (error) {
      console.error("Failed to log activity:", error);
    }
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};