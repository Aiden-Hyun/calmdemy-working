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

export function useCreateTodo() {
  const { user } = useAuth();
  const invalidate = useTodoInvalidation();
  return useMutation({
    mutationFn: (input: CreateTodoInput) => createTodo(user!.uid, input),
    onSuccess: invalidate,
  });
}

export function useToggleTodo() {
  const { user } = useAuth();
  const invalidate = useTodoInvalidation();
  return useMutation({
    mutationFn: (input: { todoId: string; done: boolean }) =>
      toggleTodo(user!.uid, input.todoId, input.done),
    onSuccess: invalidate,
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

export function useDeleteTodo() {
  const { user } = useAuth();
  const invalidate = useTodoInvalidation();
  return useMutation({
    mutationFn: (todoId: string) => deleteTodo(user!.uid, todoId),
    onSuccess: invalidate,
  });
}
