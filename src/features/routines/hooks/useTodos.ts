/**
 * ============================================================
 * features/routines/hooks/useTodos.ts — To-do queries/mutations (feats 8 & 9)
 * ============================================================
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../core/auth/AuthContext";
import {
  createTodo,
  deleteTodo,
  getTodosForRange,
  listTodos,
  toggleTodo,
  updateTodo,
  type CreateTodoInput,
  type UpdateTodoInput,
} from "../api/todos";
import { monthBounds } from "../domain/dateKeys";
import type { Todo } from "../types";

/** All of the user's to-dos. */
export function useTodos() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["todos", user?.uid],
    queryFn: () => listTodos(user!.uid),
    enabled: !!user?.uid,
  });
}

/** Dated to-dos for the month containing `monthKey` (any YYYY-MM-DD in it). */
export function useTodosForMonth(monthKey: string) {
  const { user } = useAuth();
  const { start, end } = monthBounds(monthKey);
  return useQuery({
    queryKey: ["todosMonth", user?.uid, start],
    queryFn: () => getTodosForRange(user!.uid, start, end),
    enabled: !!user?.uid,
  });
}

function useTodoInvalidation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["todos", user?.uid] });
    queryClient.invalidateQueries({ queryKey: ["todosMonth", user?.uid] });
  };
}

/** Create — OPTIMISTIC: the new to-do appears instantly (flat list + its month
 * cache) with a temp id the reconciling refetch replaces. */
export function useCreateTodo() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTodoInput) => createTodo(uid!, input),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: ["todos", uid] });
      await queryClient.cancelQueries({ queryKey: ["todosMonth", uid] });
      const prevTodos = queryClient.getQueryData<Todo[]>(["todos", uid]);
      const prevMonths = queryClient.getQueriesData<Todo[]>({ queryKey: ["todosMonth", uid] });
      const temp: Todo = {
        id: `temp-${Date.now()}`,
        userId: uid ?? "",
        title: input.title.trim(),
        notes: input.notes,
        dateKey: input.dateKey,
        time: input.time,
        kind: input.kind ?? "task",
        done: false,
        goalTagIds: input.goalTagIds,
        order: Date.now(),
        createdAt: Date.now(),
      };
      queryClient.setQueryData<Todo[]>(["todos", uid], (list) => [temp, ...(list ?? [])]);
      if (temp.dateKey) {
        const monthStart = monthBounds(temp.dateKey).start;
        queryClient.setQueryData<Todo[]>(["todosMonth", uid, monthStart], (list) =>
          list ? [temp, ...list] : list
        );
      }
      return { prevTodos, prevMonths };
    },
    onError: (_err, _input, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData(["todos", uid], ctx.prevTodos);
      ctx.prevMonths.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos", uid] });
      queryClient.invalidateQueries({ queryKey: ["todosMonth", uid] });
    },
  });
}

/**
 * Toggle done — OPTIMISTIC: the checkbox flips immediately by patching every
 * cached todo list (the flat list + any month caches); the Firestore write and
 * a reconciling refetch happen in the background, with rollback on error.
 */
export function useToggleTodo() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  const todosKey = ["todos", uid];
  const monthFilter = { queryKey: ["todosMonth", uid] };

  return useMutation({
    mutationFn: (input: { todoId: string; done: boolean }) =>
      toggleTodo(uid!, input.todoId, input.done),
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: todosKey });
      await queryClient.cancelQueries(monthFilter);

      const patch = (list?: Todo[]) =>
        list?.map((t) =>
          t.id === input.todoId
            ? { ...t, done: input.done, completedAt: input.done ? Date.now() : undefined }
            : t
        );

      const prevTodos = queryClient.getQueryData<Todo[]>(todosKey);
      const prevMonths = queryClient.getQueriesData<Todo[]>(monthFilter);

      queryClient.setQueryData<Todo[]>(todosKey, patch);
      queryClient.setQueriesData<Todo[]>(monthFilter, patch);

      return { prevTodos, prevMonths };
    },
    onError: (_err, _input, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData(todosKey, ctx.prevTodos);
      ctx.prevMonths.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: todosKey });
      queryClient.invalidateQueries(monthFilter);
    },
  });
}

export function useUpdateTodo() {
  const { user } = useAuth();
  const invalidate = useTodoInvalidation();
  return useMutation({
    mutationFn: (input: { todoId: string; patch: UpdateTodoInput }) =>
      updateTodo(user!.uid, input.todoId, input.patch),
    onSuccess: invalidate,
  });
}

/** Delete — OPTIMISTIC: the row disappears instantly from every cached list. */
export function useDeleteTodo() {
  const { user } = useAuth();
  const uid = user?.uid;
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (todoId: string) => deleteTodo(uid!, todoId),
    onMutate: async (todoId) => {
      await queryClient.cancelQueries({ queryKey: ["todos", uid] });
      await queryClient.cancelQueries({ queryKey: ["todosMonth", uid] });
      const prevTodos = queryClient.getQueryData<Todo[]>(["todos", uid]);
      const prevMonths = queryClient.getQueriesData<Todo[]>({ queryKey: ["todosMonth", uid] });
      queryClient.setQueryData<Todo[]>(["todos", uid], (list) => list?.filter((t) => t.id !== todoId));
      queryClient.setQueriesData<Todo[]>({ queryKey: ["todosMonth", uid] }, (list) =>
        list?.filter((t) => t.id !== todoId)
      );
      return { prevTodos, prevMonths };
    },
    onError: (_err, _todoId, ctx) => {
      if (!ctx) return;
      queryClient.setQueryData(["todos", uid], ctx.prevTodos);
      ctx.prevMonths.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["todos", uid] });
      queryClient.invalidateQueries({ queryKey: ["todosMonth", uid] });
    },
  });
}
