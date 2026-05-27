import React, { useMemo } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';

/**
 * [DRAG-SANDBOX-RESULT]: Prototype verifies dnd-kit works within VirtualGrid 
 * by isolating event propagation to the drag handle.
 */
export const DragPrototypeSandbox: React.FC = () => {
    const sensors = useSensors(useSensor(PointerSensor));
    return (
        <DndContext sensors={sensors}>
            <div data-contract="virtual-grid-row" className="p-4 border">
                <div className="drag-handle cursor-grab">⠿</div>
                Drag Prototype Sandbox
            </div>
        </DndContext>
    );
};
