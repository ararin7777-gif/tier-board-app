"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { moveItems } from "@/app/boards/[boardId]/actions";
import { AddTierButton } from "@/components/add-tier-button";
import { ItemCard } from "@/components/item-card";
import { TierRow } from "@/components/tier-row";

type ItemRow = {
  id: string;
  name: string;
  image_url: string | null;
  tier_id: string | null;
  position: number;
};

type TierData = {
  id: string;
  label: string;
  color: string;
  position: number;
};

const POOL_ID = "pool";

function containerIdOf(item: ItemRow) {
  return item.tier_id ?? POOL_ID;
}

function DroppableContainer({
  id,
  children,
}: {
  id: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-16 flex-1 flex-wrap items-center gap-1.5 rounded-lg transition-colors sm:min-h-24 sm:gap-2 ${
        isOver ? "bg-accent/10" : ""
      }`}
    >
      {children}
    </div>
  );
}

function SortableItem({ boardId, item }: { boardId: string; item: ItemRow }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: transition ?? undefined,
        opacity: isDragging ? 0.4 : 1,
        touchAction: "none",
      }}
      {...attributes}
      {...listeners}
    >
      <ItemCard boardId={boardId} item={item} />
    </div>
  );
}

export function BoardEditor({
  boardId,
  tiers,
  items: initialItems,
}: {
  boardId: string;
  tiers: TierData[];
  items: ItemRow[];
}) {
  const [items, setItems] = useState(initialItems);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  const tierIds = new Set(tiers.map((t) => t.id));

  const resolveContainerId = (id: string): string => {
    if (id === POOL_ID || tierIds.has(id)) return id;
    return items.find((i) => i.id === id)?.tier_id ?? POOL_ID;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const persist = (updates: ItemRow[]) => {
    startTransition(async () => {
      try {
        await moveItems(
          boardId,
          updates.map((i) => ({
            id: i.id,
            tierId: i.tier_id,
            position: i.position,
          })),
        );
      } catch {
        toast.error("移動の保存に失敗しました");
      }
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeItemId = String(active.id);
    const overId = String(over.id);
    const sourceContainer = resolveContainerId(activeItemId);
    const destContainer = resolveContainerId(overId);

    const sourceItems = items
      .filter((i) => containerIdOf(i) === sourceContainer)
      .sort((a, b) => a.position - b.position);

    if (sourceContainer === destContainer) {
      const oldIndex = sourceItems.findIndex((i) => i.id === activeItemId);
      const overIndex = sourceItems.findIndex((i) => i.id === overId);
      if (oldIndex === -1 || overIndex === -1 || oldIndex === overIndex) return;

      const reordered = arrayMove(sourceItems, oldIndex, overIndex).map(
        (item, index) => ({ ...item, position: index * 10 }),
      );

      setItems((prev) =>
        prev.map((i) => reordered.find((u) => u.id === i.id) ?? i),
      );
      persist(reordered);
      return;
    }

    const destItems = items
      .filter((i) => containerIdOf(i) === destContainer)
      .sort((a, b) => a.position - b.position);

    const overIndex = destItems.findIndex((i) => i.id === overId);
    const insertIndex = overIndex === -1 ? destItems.length : overIndex;

    const movedItem = items.find((i) => i.id === activeItemId);
    if (!movedItem) return;

    const newTierId = destContainer === POOL_ID ? null : destContainer;
    const relocated = { ...movedItem, tier_id: newTierId };

    const newSource = sourceItems
      .filter((i) => i.id !== activeItemId)
      .map((item, index) => ({ ...item, position: index * 10 }));

    const newDest = [
      ...destItems.slice(0, insertIndex),
      relocated,
      ...destItems.slice(insertIndex),
    ].map((item, index) => ({ ...item, tier_id: newTierId, position: index * 10 }));

    const allUpdated = [...newSource, ...newDest];

    setItems((prev) =>
      prev.map((i) => allUpdated.find((u) => u.id === i.id) ?? i),
    );
    persist(allUpdated);
  };

  const activeItem = items.find((i) => i.id === activeId);
  const poolItems = items
    .filter((i) => !i.tier_id)
    .sort((a, b) => a.position - b.position);

  return (
    <DndContext
      id={`board-dnd-${boardId}`}
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
        {tiers.map((tier, index) => {
          const tierItems = items
            .filter((i) => i.tier_id === tier.id)
            .sort((a, b) => a.position - b.position);
          return (
            <TierRow
              key={tier.id}
              boardId={boardId}
              tier={tier}
              isFirst={index === 0}
              isLast={index === tiers.length - 1}
              itemCount={tierItems.length}
            >
              <SortableContext
                items={tierItems.map((i) => i.id)}
                strategy={rectSortingStrategy}
              >
                <DroppableContainer id={tier.id}>
                  {tierItems.map((item) => (
                    <SortableItem key={item.id} boardId={boardId} item={item} />
                  ))}
                </DroppableContainer>
              </SortableContext>
            </TierRow>
          );
        })}
      </div>

      <AddTierButton boardId={boardId} />

      <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4">
        <h2 className="text-sm font-medium text-muted-foreground">
          未評価のアイテム
        </h2>
        <SortableContext
          items={poolItems.map((i) => i.id)}
          strategy={rectSortingStrategy}
        >
          <DroppableContainer id={POOL_ID}>
            {poolItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                「アイテムを追加」から画像を登録すると、ここに表示されます。
              </p>
            ) : (
              poolItems.map((item) => (
                <SortableItem key={item.id} boardId={boardId} item={item} />
              ))
            )}
          </DroppableContainer>
        </SortableContext>
      </div>

      <DragOverlay>
        {activeItem ? <ItemCard boardId={boardId} item={activeItem} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
