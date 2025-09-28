import { API_BASE_URL } from "@/config/backend";
import type { CalendarEvent } from "./types";

const API_URL = API_BASE_URL;

export const fetchTasks = async (token?: string): Promise<CalendarEvent[]> => {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }

    const response = await fetch(`${API_URL}/tasks/`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch tasks");
    }

    const data = await response.json();
    return data.tasks || [];
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }
};

export const createTask = async (task: Omit<CalendarEvent, "id">, token?: string): Promise<CalendarEvent | null> => {
  try {
    console.log("Creating task with data:", task);
    
    const taskWithImportance = {
      ...task,
      isImportant: Boolean(task.isImportant),
    };

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }
    
    const response = await fetch(`${API_URL}/tasks/`, {
      method: "POST",
      headers,
      credentials: "include",
      body: JSON.stringify(taskWithImportance),
    });

    console.log("Create task response status:", response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error("Create task failed:", errorText);
      throw new Error(`Failed to create task: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    console.log("Create task result:", result);
    return result;
  } catch (error) {
    console.error("Error creating task:", error);
    return null;
  }
};

export const updateTask = async (task: CalendarEvent, token?: string): Promise<CalendarEvent | null> => {
  try {
    if (!task.id) {
      console.error("Task ID is missing");
      return null;
    }
    
    const taskWithImportance = {
      ...task,
      isImportant: Boolean(task.isImportant),
    };

    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }
    
    const response = await fetch(`${API_URL}/tasks/${task.id}/`, {
      method: "PUT",
      headers,
      credentials: "include",
      body: JSON.stringify(taskWithImportance),
    });

    if (!response.ok) {
      throw new Error("Failed to update task");
    }

    return await response.json();
  } catch (error) {
    console.error("Error updating task:", error);
    return null;
  }
};

export const deleteTask = async (taskId: string, token?: string): Promise<boolean> => {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }
    
    const response = await fetch(`${API_URL}/tasks/${taskId}/`, {
      method: "DELETE",
      headers,
      credentials: "include",
    });

    return response.ok;
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
};

export const fetchAllEvents = async (token?: string): Promise<CalendarEvent[]> => {
  try {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    if (token) {
      headers["Authorization"] = `Token ${token}`;
    }
    
    const response = await fetch(`${API_URL}/tasks/`, {
      method: "GET",
      headers,
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Failed to fetch events");
    }

    const data = await response.json();
    console.log("Fetched events:", data);
    
    if (data && data.tasks && Array.isArray(data.tasks)) {
      return data.tasks;
    } else if (Array.isArray(data)) {
      return data;
    } else {
      console.error("Unexpected data format:", data);
      return [];
    }
  } catch (error) {
    console.error("Error fetching events:", error);
    return [];
  }
};