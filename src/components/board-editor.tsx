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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2 } from "lucide-react";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  deleteItem,
  moveItems,
  reorderTiers,
} from "@/app/boards/[boardId]/actions";
import { AddTierButton } from "@/components/add-tier-button";
import { DeleteTierDialog } from "@/components/delete-tier-dialog";
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
const TRASH_ID = "trash";

// 段の「行」を並べ替えるドラッグ操作は、段の中のアイテム(useDroppable)と
// idが衝突しないよう、専用のプレフィックスを付けたidを使う
const tierRowId = (tierId: string) => `row-${tierId}`;
const isTierRowId = (id: string) => id.startsWith("row-");
const tierIdFromRowId = (id: string) => id.slice(4);

function containerIdOf(item: ItemRow) {
  return item.tier_id ?? POOL_ID;
}

function TrashDropZone({ visible }: { visible: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: TRASH_ID });
  return (
    <div
      ref={setNodeRef}
      className={`fixed inset-x-0 bottom-6 z-50 mx-auto flex w-fit items-center gap-2 rounded-full border-2 px-6 py-3 shadow-lg transition-all ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      } ${
        isOver
          ? "scale-110 border-destructive bg-destructive text-destructive-foreground"
          : "border-destructive/40 bg-card text-destructive"
      }`}
    >
      <Trash2 className="size-5" />
      <span className="text-sm font-medium">ここにドロップして削除</span>
    </div>
  );
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

function SortableTierRow({
  boardId,
  tier,
  children,
}: {
  boardId: string;
  tier: TierData;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tierRowId(tier.id) });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition: transition ?? undefined,
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <TierRow
        boardId={boardId}
        tier={tier}
        dragHandleProps={{ ...attributes, ...listeners }}
      >
        {children}
      </TierRow>
    </div>
  );
}

export function BoardEditor({
  boardId,
  tiers: initialTiers,
  items: initialItems,
}: {
  boardId: string;
  tiers: TierData[];
  items: ItemRow[];
}) {
  const [items, setItems] = useState(initialItems);
  const [tiers, setTiers] = useState(initialTiers);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

  useEffect(() => {
    setTiers(initialTiers);
  }, [initialTiers]);

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

    const activeIdStr = String(active.id);

    // 段(Tier行)自体の並べ替え
    if (isTierRowId(activeIdStr)) {
      const overIdStr = String(over.id);
      if (!isTierRowId(overIdStr) || overIdStr === activeIdStr) return;

      const activeTierId = tierIdFromRowId(activeIdStr);
      const overTierId = tierIdFromRowId(overIdStr);
      const oldIndex = tiers.findIndex((t) => t.id === activeTierId);
      const newIndex = tiers.findIndex((t) => t.id === overTierId);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(tiers, oldIndex, newIndex).map(
        (tier, index) => ({ ...tier, position: index * 10 }),
      );
      setTiers(reordered);
      startTransition(async () => {
        try {
          await reorderTiers(boardId, reordered.map((t) => t.id));
        } catch {
          toast.error("段の並べ替えの保存に失敗しました");
        }
      });
      return;
    }

    const activeItemId = activeIdStr;
    const overId = String(over.id);

    if (overId === TRASH_ID) {
      const target = items.find((i) => i.id === activeItemId);
      if (!target) return;
      setItems((prev) => prev.filter((i) => i.id !== activeItemId));
      startTransition(async () => {
        try {
          await deleteItem(boardId, target.id, target.image_url);
          toast.success("アイテムを削除しました");
        } catch {
          toast.error("削除に失敗しました");
          setItems((prev) => [...prev, target]);
        }
      });
      return;
    }

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

  const activeItem = !activeId || isTierRowId(activeId)
    ? undefined
    : items.find((i) => i.id === activeId);
  const activeTier = activeId && isTierRowId(activeId)
    ? tiers.find((t) => t.id === tierIdFromRowId(activeId))
    : undefined;

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
      <SortableContext
        items={tiers.map((t) => tierRowId(t.id))}
        strategy={verticalListSortingStrategy}
      >
        <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4 shadow-sm">
          {tiers.map((tier) => {
            const tierItems = items
              .filter((i) => i.tier_id === tier.id)
              .sort((a, b) => a.position - b.position);
            return (
              <SortableTierRow key={tier.id} boardId={boardId} tier={tier}>
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
              </SortableTierRow>
            );
          })}
        </div>
      </SortableContext>

      <AddTierButton boardId={boardId} />
      <DeleteTierDialog
        boardId={boardId}
        tiers={tiers.map((tier) => ({
          id: tier.id,
          label: tier.label,
          color: tier.color,
          itemCount: items.filter((i) => i.tier_id === tier.id).length,
        }))}
      />

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
        {activeItem ? (
          <ItemCard boardId={boardId} item={activeItem} />
        ) : activeTier ? (
          <div
            className="flex h-16 w-14 items-center justify-center rounded-lg text-base font-bold text-white shadow-lg sm:h-24 sm:w-20 sm:text-lg"
            style={{ backgroundColor: activeTier.color }}
          >
            {activeTier.label}
          </div>
        ) : null}
      </DragOverlay>

      <TrashDropZone visible={!!activeId && !isTierRowId(activeId)} />
    </DndContext>
  );
}
