import { createApi } from "@reduxjs/toolkit/query/react";
import axiosBaseQuery from "./axiosBaseQuery";

export const apiSlice = createApi({
  reducerPath: "api",
  baseQuery: axiosBaseQuery(),
  tagTypes: ["Lead", "LeadList", "Notes", "History", "FollowUps", "Users", "Dashboard", "Notifications"],
  endpoints: (builder) => ({
    // ---- Auth -------------------------------------------------------------
    login: builder.mutation({
      query: (credentials) => ({ url: "/auth/login", method: "POST", data: credentials }),
    }),
    getMe: builder.query({
      query: () => ({ url: "/auth/me" }),
    }),

    // ---- Leads --------------------------------------------------------------
    listLeads: builder.query({
      query: (params) => ({ url: "/leads", params }),
      providesTags: ["LeadList"],
    }),
    getLead: builder.query({
      query: (leadId) => ({ url: `/leads/${leadId}` }),
      providesTags: (result, error, leadId) => [{ type: "Lead", id: leadId }],
    }),
    createLead: builder.mutation({
      query: (body) => ({ url: "/leads", method: "POST", data: body }),
      invalidatesTags: ["LeadList", "Dashboard"],
    }),
    updateLead: builder.mutation({
      query: ({ leadId, ...body }) => ({ url: `/leads/${leadId}`, method: "PATCH", data: body }),
      invalidatesTags: (r, e, { leadId }) => [{ type: "Lead", id: leadId }, "LeadList"],
    }),
    changeLeadStatus: builder.mutation({
      query: ({ leadId, ...body }) => ({
        url: `/leads/${leadId}/status`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (r, e, { leadId }) => [
        { type: "Lead", id: leadId },
        { type: "History", id: leadId },
        "LeadList",
        "Dashboard",
      ],
    }),
    changeLeadPriority: builder.mutation({
      query: ({ leadId, ...body }) => ({
        url: `/leads/${leadId}/priority`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (r, e, { leadId }) => [
        { type: "Lead", id: leadId },
        { type: "History", id: leadId },
        "LeadList",
        "Dashboard",
      ],
    }),
    assignLead: builder.mutation({
      query: ({ leadId, ...body }) => ({
        url: `/leads/${leadId}/assign`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (r, e, { leadId }) => [
        { type: "Lead", id: leadId },
        { type: "History", id: leadId },
        "LeadList",
        "Dashboard",
      ],
    }),
    deleteLead: builder.mutation({
      query: (leadId) => ({ url: `/leads/${leadId}`, method: "DELETE" }),
      invalidatesTags: ["LeadList", "Dashboard"],
    }),
    getLeadHistory: builder.query({
      query: (leadId) => ({ url: `/leads/${leadId}/history` }),
      providesTags: (r, e, leadId) => [{ type: "History", id: leadId }],
    }),

    // ---- Notes --------------------------------------------------------------
    listNotes: builder.query({
      query: (leadId) => ({ url: `/leads/${leadId}/notes` }),
      providesTags: (r, e, leadId) => [{ type: "Notes", id: leadId }],
    }),
    addNote: builder.mutation({
      query: ({ leadId, body }) => ({ url: `/leads/${leadId}/notes`, method: "POST", data: { body } }),
      invalidatesTags: (r, e, { leadId }) => [{ type: "Notes", id: leadId }],
    }),
    updateNote: builder.mutation({
      query: ({ leadId, noteId, body }) => ({ url: `/leads/${leadId}/notes/${noteId}`, method: "PATCH", data: { body } }),
      invalidatesTags: (r, e, { leadId }) => [{ type: "Notes", id: leadId }],
    }),
    deleteNote: builder.mutation({
      query: ({ leadId, noteId }) => ({ url: `/leads/${leadId}/notes/${noteId}`, method: "DELETE" }),
      invalidatesTags: (r, e, { leadId }) => [{ type: "Notes", id: leadId }],
    }),

    // ---- Follow-ups -----------------------------------------------------------
    listFollowUps: builder.query({
      query: (leadId) => ({ url: `/leads/${leadId}/follow-ups` }),
      providesTags: (r, e, leadId) => [{ type: "FollowUps", id: leadId }],
    }),
    createFollowUp: builder.mutation({
      query: ({ leadId, ...body }) => ({
        url: `/leads/${leadId}/follow-ups`,
        method: "POST",
        data: body,
      }),
      invalidatesTags: (r, e, { leadId }) => [{ type: "FollowUps", id: leadId }, "Dashboard"],
    }),
    updateFollowUp: builder.mutation({
      query: ({ leadId, followUpId, ...body }) => ({
        url: `/leads/${leadId}/follow-ups/${followUpId}`,
        method: "PATCH",
        data: body,
      }),
      invalidatesTags: (r, e, { leadId }) => [{ type: "FollowUps", id: leadId }, "Dashboard"],
    }),
    deleteFollowUp: builder.mutation({
      query: ({ leadId, followUpId }) => ({
        url: `/leads/${leadId}/follow-ups/${followUpId}`,
        method: "DELETE",
      }),
      invalidatesTags: (r, e, { leadId }) => [{ type: "FollowUps", id: leadId }, "Dashboard"],
    }),

    // ---- Users (admin) --------------------------------------------------------
    listUsers: builder.query({
      query: () => ({ url: "/users" }),
      providesTags: ["Users"],
    }),
    listAssignableUsers: builder.query({
      query: () => ({ url: "/users/assignable" }),
    }),
    createUser: builder.mutation({
      query: (body) => ({ url: "/users", method: "POST", data: body }),
      invalidatesTags: ["Users"],
    }),
    updateUser: builder.mutation({
      query: ({ userId, ...body }) => ({ url: `/users/${userId}`, method: "PATCH", data: body }),
      invalidatesTags: ["Users"],
    }),
    deactivateUser: builder.mutation({
      query: (userId) => ({ url: `/users/${userId}/deactivate`, method: "POST" }),
      invalidatesTags: ["Users"],
    }),

    // ---- Dashboard --------------------------------------------------------
    listNotifications: builder.query({
      query: () => ({ url: "/notifications" }),
      providesTags: ["Notifications"],
    }),
    markNotificationRead: builder.mutation({
      query: (notificationId) => ({ url: `/notifications/${notificationId}/read`, method: "POST" }),
      invalidatesTags: ["Notifications"],
    }),
    getDashboard: builder.query({
      query: () => ({ url: "/dashboard" }),
      providesTags: ["Dashboard"],
    }),
  }),
});

export const {
  useLoginMutation,
  useGetMeQuery,
  useListLeadsQuery,
  useGetLeadQuery,
  useCreateLeadMutation,
  useUpdateLeadMutation,
  useChangeLeadStatusMutation,
  useChangeLeadPriorityMutation,
  useAssignLeadMutation,
  useDeleteLeadMutation,
  useGetLeadHistoryQuery,
  useListNotesQuery,
  useAddNoteMutation,
  useUpdateNoteMutation,
  useDeleteNoteMutation,
  useListFollowUpsQuery,
  useCreateFollowUpMutation,
  useUpdateFollowUpMutation,
  useDeleteFollowUpMutation,
  useListNotificationsQuery,
  useMarkNotificationReadMutation,
  useListUsersQuery,
  useListAssignableUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useGetDashboardQuery,
} = apiSlice;
