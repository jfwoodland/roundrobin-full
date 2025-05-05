import React from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

const UserList = ({ users, onReorder }) => {
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const updatedUsers = Array.from(users);
    const [moved] = updatedUsers.splice(result.source.index, 1);
    updatedUsers.splice(result.destination.index, 0, moved);

    // Reassign the 'order' field
    const reordered = updatedUsers.map((user, index) => ({
      ...user,
      order: index
    }));

    onReorder(reordered);
  };

  return (
    <div>
      <h2>User Order</h2>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="users">
          {(provided) => (
            <ul
              className="user-list"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {users.map((user, index) => (
                <Draggable key={user.id} draggableId={user.id} index={index}>
                  {(provided) => (
                    <li
                      className="user-item"
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                    >
                      {user.name} — {user.phone_number}
                    </li>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </ul>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default UserList;
