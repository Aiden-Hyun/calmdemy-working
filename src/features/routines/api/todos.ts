/**
 * ============================================================
 * features/routines/api/todos.ts — To-dos (collection D, feats 8 & 9)
 * ============================================================
 *
 * One-off tasks, optionally placed on a day (`dateKey`) for the calendar.
 * Done-ness lives on the instance (`done`/`completedAt`) — there is no
 * per-occurrence collection (a to-do is a single instance, not a habit).
 *
 * Conventions (§5.3): reads try/caught → []; writes throw; never write
 * `undefined`.
 * ============================================================
 */

import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  limit,
} from "firebase/firestore";
import { db } from "../../../core/firebase";
import type { Todo, TodoKind } from "../types";

function todosCollection(userId: string) {
  return collection(db, "users", userId, "routineTodos");
}

function mapTodo(id: string, data: Record<string, unknown>, userId: string): Todo {
  return {
    id,
    userId,
    title: typeof data.title === "string" ? data.title : "",
    notes: typeof data.notes === "string" ? data.notes : undefined,
    dateKey: typeof data.dateKey === "string" ? data.dateKey : undefined,
    time: typeof data.time === "string" ? data.time : undefined,
    kind: (typeof data.kind === "string" ? data.kind : "task") as TodoKind,
    done: data.done === true,
    completedAt: typeof data.completedAt === "number" ? data.completedAt : undefined,
    goalTagIds: Array.isArray(data.goalTagIds) ? (data.goalTagIds as string[]) : undefined,
    reminderKey: typeof data.reminderKey === "string" ? data.reminderKey : undefined,
    order: typeof data.order === "number" ? data.order : 0,
    createdAt: typeof data.createdAt === "number" ? data.createdAt : 0,
  };
}

export interface CreateTodoInput {
  title: string;
  notes?: string;
  dateKey?: string;
  time?: string;
  kind?: TodoKind;
  goalTagIds?: string[];
}

/** Create a to-do (not done). Returns the new id. */
export async function createTodo(userId: string, input: CreateTodoInput): Promise<string> {
  const data: Record<string, unknown> = {
    userId,
    title: input.title.trim(),
    kind: input.kind ?? "task",
    done: false,
    order: Date.now(),
    createdAt: Date.now(),
  };
  if (input.notes) data.notes = input.notes;
  if (input.dateKey) data.dateKey = input.dateKey;
  if (input.time) data.time = input.time;
  if (input.goalTagIds?.length) data.goalTagIds = input.goalTagIds;

  const docRef = await addDoc(todosCollection(userId), data);
  return docRef.id;
}

export type UpdateTodoInput = Partial<Pick<Todo, "title" | "notes" | "dateKey" | "time" | "kind">>;

export async function updateTodo(
  userId: string,
  todoId: string,
  patch: UpdateTodoInput
): Promise<void> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) data[key] = value;
  }
  if (Object.keys(data).length === 0) return;
  await updateDoc(doc(todosCollection(userId), todoId), data);
}

/** Toggle done. `completedAt` is set when done, cleared (null) when undone. */
export async function toggleTodo(userId: string, todoId: string, done: boolean): Promise<void> {
  await updateDoc(doc(todosCollection(userId), todoId), {
    done,
    completedAt: done ? Date.now() : null,
  });
}

export async function deleteTodo(userId: string, todoId: string): Promise<void> {
  await deleteDoc(doc(todosCollection(userId), todoId));
}

/** All to-dos, newest first. [] on error. */
export async function listTodos(userId: string): Promise<Todo[]> {
  try {
    const q = query(todosCollection(userId), orderBy("createdAt", "desc"), limit(300));
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapTodo(d.id, d.data(), userId));
  } catch (error) {
    console.error("Error fetching todos:", error);
    return [];
  }
}

/** Dated to-dos within a date range (for the calendar). [] on error. */
export async function getTodosForRange(
  userId: string,
  startKey: string,
  endKey: string
): Promise<Todo[]> {
  try {
    const q = query(
      todosCollection(userId),
      where("dateKey", ">=", startKey),
      where("dateKey", "<=", endKey)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => mapTodo(d.id, d.data(), userId));
  } catch (error) {
    console.error("Error fetching todos for range:", error);
    return [];
  }
}
