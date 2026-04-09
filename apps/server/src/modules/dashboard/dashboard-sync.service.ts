import { Injectable, MessageEvent } from "@nestjs/common";
import { Observable, Subject, interval, map, merge } from "rxjs";

type DashboardSyncEntityType = "instance" | "template" | "takeover_request";

interface DashboardSyncPayload {
  topic: "chores";
  action: string;
  entityType: DashboardSyncEntityType;
  entityId?: string;
  actorUserId?: string;
  occurredAt: string;
}

@Injectable()
export class DashboardSyncService {
  private readonly householdStreams = new Map<string, Subject<DashboardSyncPayload>>();

  streamForHousehold(householdId: string): Observable<MessageEvent> {
    const subject = this.getOrCreateHouseholdStream(householdId);

    return merge(
      subject.pipe(
        map((payload) => ({
          type: "chore-sync",
          data: payload
        }))
      ),
      interval(25000).pipe(
        map(() => ({
          type: "heartbeat",
          data: {
            topic: "heartbeat",
            occurredAt: new Date().toISOString()
          }
        }))
      )
    );
  }

  publishChoreUpdate(input: {
    householdId: string;
    action: string;
    entityType: DashboardSyncEntityType;
    entityId?: string;
    actorUserId?: string;
  }) {
    const subject = this.getOrCreateHouseholdStream(input.householdId);
    subject.next({
      topic: "chores",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      actorUserId: input.actorUserId,
      occurredAt: new Date().toISOString()
    });
  }

  private getOrCreateHouseholdStream(householdId: string) {
    const existing = this.householdStreams.get(householdId);
    if (existing) {
      return existing;
    }

    const created = new Subject<DashboardSyncPayload>();
    this.householdStreams.set(householdId, created);
    return created;
  }
}
