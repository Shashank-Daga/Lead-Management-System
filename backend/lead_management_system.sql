--
-- PostgreSQL database dump
--

\restrict 9vRtboMNshw3DKinhJs4OMDfOpT41LTPYbKgFgCrfiXzxdBvspmuwu5PrjOEC2c

-- Dumped from database version 18.6 (Debian 18.6-1.pgdg12+2)
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: FollowUpStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."FollowUpStatus" AS ENUM (
    'PENDING',
    'COMPLETED',
    'CANCELLED'
);


--
-- Name: LeadPriority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LeadPriority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'URGENT'
);


--
-- Name: LeadStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."LeadStatus" AS ENUM (
    'NEW',
    'CONTACTED',
    'QUALIFIED',
    'PROPOSAL',
    'NEGOTIATION',
    'ON_HOLD',
    'CONVERTED',
    'LOST'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: assignment_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assignment_history (
    id text NOT NULL,
    "leadId" text NOT NULL,
    "fromUserId" text,
    "toUserId" text NOT NULL,
    "assignedById" text NOT NULL,
    reason text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: follow_ups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.follow_ups (
    id text NOT NULL,
    "leadId" text NOT NULL,
    "ownerId" text NOT NULL,
    "dueAt" timestamp(3) without time zone NOT NULL,
    notes text,
    status public."FollowUpStatus" DEFAULT 'PENDING'::public."FollowUpStatus" NOT NULL,
    "completedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: lead_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_history (
    id text NOT NULL,
    "leadId" text NOT NULL,
    "actorId" text NOT NULL,
    "eventType" text NOT NULL,
    "fromValue" text,
    "toValue" text,
    comment text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: lead_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_notes (
    id text NOT NULL,
    "leadId" text NOT NULL,
    "authorId" text NOT NULL,
    body text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: lead_sequence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lead_sequence (
    id text DEFAULT 'singleton'::text NOT NULL,
    "lastValue" integer DEFAULT 0 NOT NULL
);


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id text NOT NULL,
    "leadCode" text NOT NULL,
    "clientName" text NOT NULL,
    "contactPerson" text NOT NULL,
    email text,
    phone text NOT NULL,
    "alternatePhone" text,
    address text,
    source text NOT NULL,
    "productInterest" text,
    description text,
    status public."LeadStatus" DEFAULT 'NEW'::public."LeadStatus" NOT NULL,
    priority public."LeadPriority" DEFAULT 'MEDIUM'::public."LeadPriority" NOT NULL,
    "currentAssigneeId" text,
    "assignmentDate" timestamp(3) without time zone,
    "nextFollowUpDate" timestamp(3) without time zone,
    "lastContactDate" timestamp(3) without time zone,
    "conversionDate" timestamp(3) without time zone,
    "lossReason" text,
    tags text[] DEFAULT ARRAY[]::text[],
    "isDeleted" boolean DEFAULT false NOT NULL,
    "deletedAt" timestamp(3) without time zone,
    "deletedById" text,
    "createdById" text NOT NULL,
    "updatedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "previousStatus" public."LeadStatus"
);


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id text DEFAULT gen_random_uuid() NOT NULL,
    "userId" text NOT NULL,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    "isRead" boolean DEFAULT false NOT NULL,
    metadata jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.permissions (
    id text NOT NULL,
    key text NOT NULL,
    description text
);


--
-- Name: role_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.role_permissions (
    "roleId" text NOT NULL,
    "permissionId" text NOT NULL
);


--
-- Name: roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roles (
    id text NOT NULL,
    key text NOT NULL,
    name text NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id text NOT NULL,
    "fullName" text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    "roleId" text NOT NULL,
    "managerId" text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    phone text,
    "dateOfBirth" date,
    "passwordChangedAt" timestamp(3) without time zone
);


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
2ea2e6a0-7428-4d82-a48a-1ed18fdeccab	9b58ad78bc74b050c1294db768cc59b85c21774f50471243118e305349d890af	2026-10-10 08:09:24.851036+00	20260925030835_init	\N	\N	2026-10-10 08:09:24.551064+00	1
2f429c8e-1b65-4626-91b4-72521f91cdc0	16fa33cce92249a85b526957b2400149c7238e52380bc5434ad7d6ea98114d01	2026-10-10 08:09:24.862784+00	20260927000000_add_ons_hold_history_and_notifications	\N	\N	2026-10-10 08:09:24.853388+00	1
09e94cbe-4ebe-4c1d-83ea-e42700f89396	e94986f9d6526b386d3d1d573d187c1f9197564bce1d84b344aef6a9b88447db	2026-10-10 08:09:24.871144+00	20261002000000_add_notification_uuid_default	\N	\N	2026-10-10 08:09:24.865009+00	1
626acb40-f1a0-4ac1-984b-fa9e605dc464	ca428bf718aafe85e7894d71b03807b43acf79be5b0678762849d188e901de97	2026-10-10 08:09:24.951881+00	20261004070618_remove_organization	\N	\N	2026-10-10 08:09:24.873357+00	1
1b3956bd-6ae3-4d4f-85f5-07bee666876d	f455228c1ced391569a329c2ce93af3eda5830f13d2770b74d5c7fd5423a6444	2026-10-10 08:09:24.963356+00	20261004080000_restore_notification_uuid_default	\N	\N	2026-10-10 08:09:24.954379+00	1
9b225f7e-cd0c-4bf3-ae20-b7c9f6823b4b	1a04d9214ab095c1285d63f796c8078367ff6c6c5b572f27b9e83d48412d9855	2026-10-13 10:49:59.061025+00	20261012000000_add_user_profile_fields	\N	\N	2026-10-13 10:49:59.052325+00	1
3a82c565-879a-4681-ad6e-1fdc04679745	8c369f4678612bc5a11a28e406a1dc64f87291c77b8fc1212449cc55768d9477	2026-10-15 06:54:27.645951+00	20261015110000_add_leads_status_index	\N	\N	2026-10-15 06:54:27.625244+00	1
\.


--
-- Data for Name: assignment_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.assignment_history (id, "leadId", "fromUserId", "toUserId", "assignedById", reason, "createdAt") FROM stdin;
b7392d80-504d-423a-b565-06465d93e5a4	7d246450-7857-4cf3-ac21-31c7cbd94d3d	\N	7f6bce18-896e-4e39-9bfe-122689c43da3	0ad625cc-c9cf-4e47-89f9-ecd59381ea68		2026-10-11 18:18:26.351
c16cdb8d-6510-4dbb-9393-1ad331598f2b	7d246450-7857-4cf3-ac21-31c7cbd94d3d	7f6bce18-896e-4e39-9bfe-122689c43da3	63f79603-8e00-4371-9b24-a47446315256	7f6bce18-896e-4e39-9bfe-122689c43da3		2026-10-11 18:21:19.963
\.


--
-- Data for Name: follow_ups; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.follow_ups (id, "leadId", "ownerId", "dueAt", notes, status, "completedAt", "createdAt", "updatedAt") FROM stdin;
c578c7fb-3591-4d09-b436-20c17c9fa5bb	7d246450-7857-4cf3-ac21-31c7cbd94d3d	0ad625cc-c9cf-4e47-89f9-ecd59381ea68	2026-10-11 18:20:00		COMPLETED	2026-10-12 05:32:08.206	2026-10-11 18:19:03.477	2026-10-12 05:32:08.207
\.


--
-- Data for Name: lead_history; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lead_history (id, "leadId", "actorId", "eventType", "fromValue", "toValue", comment, "createdAt") FROM stdin;
5c235b1a-b610-4850-8ecc-6bbefcaea6c8	7d246450-7857-4cf3-ac21-31c7cbd94d3d	0ad625cc-c9cf-4e47-89f9-ecd59381ea68	CREATED	\N	NEW	\N	2026-10-11 18:18:12.796
5ac7609a-71d2-4247-8a41-e04351ecd700	7d246450-7857-4cf3-ac21-31c7cbd94d3d	0ad625cc-c9cf-4e47-89f9-ecd59381ea68	ASSIGNED	\N	7f6bce18-896e-4e39-9bfe-122689c43da3		2026-10-11 18:18:26.364
102dc181-ab6a-45ed-95c9-97585bc73cbd	7d246450-7857-4cf3-ac21-31c7cbd94d3d	0ad625cc-c9cf-4e47-89f9-ecd59381ea68	FIELD_UPDATE	\N	\N	Lead details updated	2026-10-11 18:18:47.646
94dff867-8673-4273-98af-13d6e4e78d38	7d246450-7857-4cf3-ac21-31c7cbd94d3d	7f6bce18-896e-4e39-9bfe-122689c43da3	REASSIGNED	7f6bce18-896e-4e39-9bfe-122689c43da3	63f79603-8e00-4371-9b24-a47446315256		2026-10-11 18:21:19.968
a2446cc1-02b4-4b55-9f77-43d5198f362c	7d246450-7857-4cf3-ac21-31c7cbd94d3d	7f6bce18-896e-4e39-9bfe-122689c43da3	STATUS_CHANGE	NEW	QUALIFIED		2026-10-11 18:21:28.21
8101ad59-894d-4b87-bb7c-9ee8dcd908b3	b1bbcbee-4106-4cd6-9187-8b741cee4842	0ad625cc-c9cf-4e47-89f9-ecd59381ea68	CREATED	\N	NEW	\N	2026-10-16 09:43:04.808
\.


--
-- Data for Name: lead_notes; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lead_notes (id, "leadId", "authorId", body, "createdAt", "updatedAt") FROM stdin;
d2b12634-785d-4672-bf1d-0adca0a68188	7d246450-7857-4cf3-ac21-31c7cbd94d3d	7f6bce18-896e-4e39-9bfe-122689c43da3	Notes taken	2026-10-11 18:21:12.532	2026-10-11 18:21:12.532
\.


--
-- Data for Name: lead_sequence; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.lead_sequence (id, "lastValue") FROM stdin;
singleton	2
\.


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.leads (id, "leadCode", "clientName", "contactPerson", email, phone, "alternatePhone", address, source, "productInterest", description, status, priority, "currentAssigneeId", "assignmentDate", "nextFollowUpDate", "lastContactDate", "conversionDate", "lossReason", tags, "isDeleted", "deletedAt", "deletedById", "createdById", "updatedById", "createdAt", "updatedAt", "previousStatus") FROM stdin;
7d246450-7857-4cf3-ac21-31c7cbd94d3d	LD-000001	Testing	Tester	test@gmail.com	9999999999	\N	\N	Website	Testing	Who knows	QUALIFIED	MEDIUM	63f79603-8e00-4371-9b24-a47446315256	2026-10-11 18:21:19.959	\N	2026-10-12 05:32:08.207	\N	\N	{}	f	\N	\N	0ad625cc-c9cf-4e47-89f9-ecd59381ea68	7f6bce18-896e-4e39-9bfe-122689c43da3	2026-10-11 18:18:12.79	2026-10-12 05:32:08.211	\N
b1bbcbee-4106-4cd6-9187-8b741cee4842	LD-000002	ABC	Tester	opalraut7@gmail.com	9322473860	\N	\N	website.com	Sample	\N	NEW	HIGH	\N	\N	\N	\N	\N	\N	{}	f	\N	\N	0ad625cc-c9cf-4e47-89f9-ecd59381ea68	\N	2026-10-16 09:43:04.805	2026-10-16 09:43:04.805	\N
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.notifications (id, "userId", type, title, message, "isRead", metadata, "createdAt") FROM stdin;
6e374721-8cf6-4c47-95cd-f7ac772a8c44	7f6bce18-896e-4e39-9bfe-122689c43da3	LEAD_ASSIGNED	Lead assigned	Lead LD-000001 was assigned to you.	t	{"leadId": "7d246450-7857-4cf3-ac21-31c7cbd94d3d", "leadCode": "LD-000001"}	2026-10-11 18:18:26.358
25bdb709-d4af-4896-a1fe-b0c793345e0a	63f79603-8e00-4371-9b24-a47446315256	LEAD_ASSIGNED	Lead assigned	Lead LD-000001 was assigned to you.	t	{"leadId": "7d246450-7857-4cf3-ac21-31c7cbd94d3d", "leadCode": "LD-000001"}	2026-10-11 18:21:19.965
3e672f76-8955-492e-9394-c89e2cacd743	575c8826-ccb4-4bbf-ab05-9c6f3182dbb9	LEAD_ASSIGNED	Committed notification	Persisted after successful transaction	f	{"test": true}	2026-10-12 05:25:16.189
4842c784-6f42-4de3-8801-548f51e5abb3	3ef223ff-8b6c-4b98-9417-319ff001b672	EXECUTIVE_ASSIGNED	Executive assigned to you	Executive Notify is now assigned to your team.	f	{"executiveId": "d339ee93-a344-4af8-980b-3af1d815fbc9", "executiveName": "Executive Notify"}	2026-10-12 05:25:17.829
\.


--
-- Data for Name: permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.permissions (id, key, description) FROM stdin;
ceaba0b1-3cfa-4e55-a840-4cb579b944f0	lead.view_all	\N
f9d1030c-f407-4296-b17b-50d4f64b6c53	lead.view_scoped	\N
ce6f3592-d52f-425d-9298-41ff94d25157	lead.view_assigned	\N
a9c7d9cc-a684-47ab-8a65-7a765acf40dc	lead.create	\N
e6a12dd2-3604-4e41-ba26-71065867b0bb	lead.edit_all	\N
d22fe584-18e1-451f-a97c-72ededd059af	lead.edit_scoped	\N
361a832d-86a6-4f4c-9eca-934778837b8e	lead.edit_assigned	\N
8399ee96-c36b-42a8-9c9f-87492c0eca23	lead.assign	\N
f5b584d3-f50a-4a9d-ad01-8635920d1c7e	lead.reassign	\N
292ef05a-8a33-49e6-98a1-2420fa355688	lead.change_status	\N
ec85ae29-b36e-4e39-b843-a8a68e427e0a	lead.change_priority	\N
15e3647c-5e30-464e-ae7a-0fc21b146026	lead.delete	\N
bafad479-f179-4893-a3bf-8186f9a15de3	lead.add_note	\N
a9afdcdc-b16b-466d-af11-98c7c47356d1	followup.manage_all	\N
30292d9e-2550-4fb0-ac1d-e0dd0fda573c	followup.manage_assigned	\N
a46ddf59-c40b-478f-b1d1-73158d8e465b	history.view_all	\N
f9fe9df6-ac48-4143-88a8-bce92dd862b8	history.view_scoped	\N
7a291e0b-8fe4-4744-838a-4486b9f7d0e5	history.view_assigned	\N
35173205-0afb-4f43-8466-f69437ae87ee	export.data	\N
f09db583-eca2-4ca0-896f-3c51c9a8ee5f	reports.view	\N
7ae624a8-0ab6-4c70-bfdc-76effbf1679c	user.manage	\N
363ad23b-6e79-40e0-94f2-14068f78fb59	role.manage	\N
\.


--
-- Data for Name: role_permissions; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.role_permissions ("roleId", "permissionId") FROM stdin;
88b70653-68f8-4454-a8f3-433577058c09	ceaba0b1-3cfa-4e55-a840-4cb579b944f0
88b70653-68f8-4454-a8f3-433577058c09	f9d1030c-f407-4296-b17b-50d4f64b6c53
88b70653-68f8-4454-a8f3-433577058c09	ce6f3592-d52f-425d-9298-41ff94d25157
88b70653-68f8-4454-a8f3-433577058c09	a9c7d9cc-a684-47ab-8a65-7a765acf40dc
88b70653-68f8-4454-a8f3-433577058c09	e6a12dd2-3604-4e41-ba26-71065867b0bb
88b70653-68f8-4454-a8f3-433577058c09	d22fe584-18e1-451f-a97c-72ededd059af
88b70653-68f8-4454-a8f3-433577058c09	361a832d-86a6-4f4c-9eca-934778837b8e
88b70653-68f8-4454-a8f3-433577058c09	8399ee96-c36b-42a8-9c9f-87492c0eca23
88b70653-68f8-4454-a8f3-433577058c09	f5b584d3-f50a-4a9d-ad01-8635920d1c7e
88b70653-68f8-4454-a8f3-433577058c09	292ef05a-8a33-49e6-98a1-2420fa355688
88b70653-68f8-4454-a8f3-433577058c09	ec85ae29-b36e-4e39-b843-a8a68e427e0a
88b70653-68f8-4454-a8f3-433577058c09	15e3647c-5e30-464e-ae7a-0fc21b146026
88b70653-68f8-4454-a8f3-433577058c09	bafad479-f179-4893-a3bf-8186f9a15de3
88b70653-68f8-4454-a8f3-433577058c09	a9afdcdc-b16b-466d-af11-98c7c47356d1
88b70653-68f8-4454-a8f3-433577058c09	30292d9e-2550-4fb0-ac1d-e0dd0fda573c
88b70653-68f8-4454-a8f3-433577058c09	a46ddf59-c40b-478f-b1d1-73158d8e465b
88b70653-68f8-4454-a8f3-433577058c09	f9fe9df6-ac48-4143-88a8-bce92dd862b8
88b70653-68f8-4454-a8f3-433577058c09	7a291e0b-8fe4-4744-838a-4486b9f7d0e5
88b70653-68f8-4454-a8f3-433577058c09	35173205-0afb-4f43-8466-f69437ae87ee
88b70653-68f8-4454-a8f3-433577058c09	f09db583-eca2-4ca0-896f-3c51c9a8ee5f
88b70653-68f8-4454-a8f3-433577058c09	7ae624a8-0ab6-4c70-bfdc-76effbf1679c
88b70653-68f8-4454-a8f3-433577058c09	363ad23b-6e79-40e0-94f2-14068f78fb59
daba8afc-1354-4315-a68a-bc434f0a2113	f9d1030c-f407-4296-b17b-50d4f64b6c53
daba8afc-1354-4315-a68a-bc434f0a2113	ce6f3592-d52f-425d-9298-41ff94d25157
daba8afc-1354-4315-a68a-bc434f0a2113	a9c7d9cc-a684-47ab-8a65-7a765acf40dc
daba8afc-1354-4315-a68a-bc434f0a2113	d22fe584-18e1-451f-a97c-72ededd059af
daba8afc-1354-4315-a68a-bc434f0a2113	8399ee96-c36b-42a8-9c9f-87492c0eca23
daba8afc-1354-4315-a68a-bc434f0a2113	f5b584d3-f50a-4a9d-ad01-8635920d1c7e
daba8afc-1354-4315-a68a-bc434f0a2113	292ef05a-8a33-49e6-98a1-2420fa355688
daba8afc-1354-4315-a68a-bc434f0a2113	ec85ae29-b36e-4e39-b843-a8a68e427e0a
daba8afc-1354-4315-a68a-bc434f0a2113	bafad479-f179-4893-a3bf-8186f9a15de3
daba8afc-1354-4315-a68a-bc434f0a2113	a9afdcdc-b16b-466d-af11-98c7c47356d1
daba8afc-1354-4315-a68a-bc434f0a2113	f9fe9df6-ac48-4143-88a8-bce92dd862b8
daba8afc-1354-4315-a68a-bc434f0a2113	35173205-0afb-4f43-8466-f69437ae87ee
daba8afc-1354-4315-a68a-bc434f0a2113	f09db583-eca2-4ca0-896f-3c51c9a8ee5f
09af1465-b639-4159-939b-a14b3e001ae1	ce6f3592-d52f-425d-9298-41ff94d25157
09af1465-b639-4159-939b-a14b3e001ae1	361a832d-86a6-4f4c-9eca-934778837b8e
09af1465-b639-4159-939b-a14b3e001ae1	292ef05a-8a33-49e6-98a1-2420fa355688
09af1465-b639-4159-939b-a14b3e001ae1	ec85ae29-b36e-4e39-b843-a8a68e427e0a
09af1465-b639-4159-939b-a14b3e001ae1	bafad479-f179-4893-a3bf-8186f9a15de3
09af1465-b639-4159-939b-a14b3e001ae1	30292d9e-2550-4fb0-ac1d-e0dd0fda573c
09af1465-b639-4159-939b-a14b3e001ae1	7a291e0b-8fe4-4744-838a-4486b9f7d0e5
\.


--
-- Data for Name: roles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.roles (id, key, name, description, "createdAt") FROM stdin;
88b70653-68f8-4454-a8f3-433577058c09	ADMIN	Admin	\N	2026-10-11 15:42:01.966
daba8afc-1354-4315-a68a-bc434f0a2113	MANAGER	Manager	\N	2026-10-11 15:42:03.151
09af1465-b639-4159-939b-a14b3e001ae1	EXECUTIVE	Executive	\N	2026-10-11 15:42:04.038
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.users (id, "fullName", email, "passwordHash", "roleId", "managerId", "isActive", "createdAt", "updatedAt", phone, "dateOfBirth", "passwordChangedAt") FROM stdin;
7f6bce18-896e-4e39-9bfe-122689c43da3	Mia Manager	manager@demo.com	$argon2id$v=19$m=65536,t=3,p=4$zFjIP6/HvU1xTPwPBLrhMA$lUzlEzOFqlDngk4zE0ts6KhNO93eObzqfWnECy3f/vk	daba8afc-1354-4315-a68a-bc434f0a2113	\N	t	2026-10-11 15:42:05.59	2026-10-11 15:42:05.59	\N	\N	\N
63f79603-8e00-4371-9b24-a47446315256	Eli Executive	executive@demo.com	$argon2id$v=19$m=65536,t=3,p=4$zFjIP6/HvU1xTPwPBLrhMA$lUzlEzOFqlDngk4zE0ts6KhNO93eObzqfWnECy3f/vk	09af1465-b639-4159-939b-a14b3e001ae1	7f6bce18-896e-4e39-9bfe-122689c43da3	t	2026-10-11 15:42:05.967	2026-10-11 15:42:05.967	\N	\N	\N
a89a5af7-61e4-4b07-96cf-3916b10697ef	Executive A	exec-a-1791782711177@example.com	$argon2id$v=19$m=65536,t=3,p=4$testhash	09af1465-b639-4159-939b-a14b3e001ae1	\N	t	2026-10-12 05:25:11.543	2026-10-12 05:25:13.228	\N	\N	\N
7de8d32e-5ee7-4156-b30a-de9b50fc9ba2	Executive B	exec-b-1791782711617@example.com	$argon2id$v=19$m=65536,t=3,p=4$testhash	09af1465-b639-4159-939b-a14b3e001ae1	\N	t	2026-10-12 05:25:11.986	2026-10-12 05:25:13.228	\N	\N	\N
5992397d-cce8-4cea-8b32-5606b3713569	Manager A	manager-1791782709358@example.com	$argon2id$v=19$m=65536,t=3,p=4$testhash	daba8afc-1354-4315-a68a-bc434f0a2113	\N	f	2026-10-12 05:25:11.026	2026-10-12 05:25:13.377	\N	\N	\N
36c6e8bd-4e14-468a-9932-df4dcbfaaebc	Manager TX	manager-tx-1791782713771@example.com	$argon2id$v=19$m=65536,t=3,p=4$testhash	daba8afc-1354-4315-a68a-bc434f0a2113	\N	t	2026-10-12 05:25:14.145	2026-10-12 05:25:14.145	\N	\N	\N
8229f4a0-366a-4649-80b8-7e18294c7a75	Executive TX	exec-tx-1791782714221@example.com	$argon2id$v=19$m=65536,t=3,p=4$testhash	09af1465-b639-4159-939b-a14b3e001ae1	36c6e8bd-4e14-468a-9932-df4dcbfaaebc	t	2026-10-12 05:25:14.61	2026-10-12 05:25:14.61	\N	\N	\N
e6ff87dc-fcc3-407f-91e5-14a728b3e9af	Manager Commit	manager-commit-1791782715176@example.com	$argon2id$v=19$m=65536,t=3,p=4$testhash	daba8afc-1354-4315-a68a-bc434f0a2113	\N	t	2026-10-12 05:25:15.564	2026-10-12 05:25:15.564	\N	\N	\N
575c8826-ccb4-4bbf-ab05-9c6f3182dbb9	Executive Commit	exec-commit-1791782715645@example.com	$argon2id$v=19$m=65536,t=3,p=4$testhash	09af1465-b639-4159-939b-a14b3e001ae1	e6ff87dc-fcc3-407f-91e5-14a728b3e9af	t	2026-10-12 05:25:16.023	2026-10-12 05:25:16.023	\N	\N	\N
3ef223ff-8b6c-4b98-9417-319ff001b672	Manager Notify	manager-notify-1791782716416@example.com	$argon2id$v=19$m=65536,t=3,p=4$9IaPh9OimZTrX2IRN1SjHA$J/TzVbWQTs+Tn7WnoBZV++6/lTUquZfi/pFsU4Q04tE	daba8afc-1354-4315-a68a-bc434f0a2113	\N	t	2026-10-12 05:25:16.735	2026-10-12 05:25:16.735	\N	\N	\N
d339ee93-a344-4af8-980b-3af1d815fbc9	Executive Notify	exec-notify-1791782716953@example.com	$argon2id$v=19$m=65536,t=3,p=4$AEG9suC50vi0U8Y5XohwtQ$Y21gp/L7fWzAXfOGJmYnSid29E7FdLPibmMY4q/nlD0	09af1465-b639-4159-939b-a14b3e001ae1	3ef223ff-8b6c-4b98-9417-319ff001b672	t	2026-10-12 05:25:17.468	2026-10-12 05:25:17.468	\N	\N	\N
90991d90-3756-4fe0-94eb-00837c3357a9	Manager Notify	manager-notify-1791827399920@example.com	$argon2id$v=19$m=65536,t=3,p=4$pByaP+L54JAcx+YKm9tUOA$df9BAuL2kmpIgwWa5omjiQvDhzFXVd3Jd1C/lEI2Cp8	daba8afc-1354-4315-a68a-bc434f0a2113	\N	t	2026-10-12 17:50:01.319	2026-10-12 17:50:01.319	\N	\N	\N
0ad625cc-c9cf-4e47-89f9-ecd59381ea68	Ava Admin	admin@demo.com	$argon2id$v=19$m=65536,t=3,p=4$j1IHJcllRZGAn4+WqfifCg$GZsDnvkLU0+wjGT6mCJzCJJ/j/cnddXhylo/ZuJjltw	88b70653-68f8-4454-a8f3-433577058c09	\N	t	2026-10-11 15:42:05	2026-10-15 07:04:18.811	\N	\N	2026-10-15 07:04:18.81
\.


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: assignment_history assignment_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_history
    ADD CONSTRAINT assignment_history_pkey PRIMARY KEY (id);


--
-- Name: follow_ups follow_ups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT follow_ups_pkey PRIMARY KEY (id);


--
-- Name: lead_history lead_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_history
    ADD CONSTRAINT lead_history_pkey PRIMARY KEY (id);


--
-- Name: lead_notes lead_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_notes
    ADD CONSTRAINT lead_notes_pkey PRIMARY KEY (id);


--
-- Name: lead_sequence lead_sequence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_sequence
    ADD CONSTRAINT lead_sequence_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: permissions permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.permissions
    ADD CONSTRAINT permissions_pkey PRIMARY KEY (id);


--
-- Name: role_permissions role_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT role_permissions_pkey PRIMARY KEY ("roleId", "permissionId");


--
-- Name: roles roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: assignment_history_leadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "assignment_history_leadId_createdAt_idx" ON public.assignment_history USING btree ("leadId", "createdAt");


--
-- Name: follow_ups_leadId_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "follow_ups_leadId_status_idx" ON public.follow_ups USING btree ("leadId", status);


--
-- Name: follow_ups_ownerId_dueAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "follow_ups_ownerId_dueAt_idx" ON public.follow_ups USING btree ("ownerId", "dueAt");


--
-- Name: lead_history_leadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lead_history_leadId_createdAt_idx" ON public.lead_history USING btree ("leadId", "createdAt");


--
-- Name: lead_notes_leadId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "lead_notes_leadId_createdAt_idx" ON public.lead_notes USING btree ("leadId", "createdAt");


--
-- Name: leads_currentAssigneeId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "leads_currentAssigneeId_idx" ON public.leads USING btree ("currentAssigneeId");


--
-- Name: leads_isDeleted_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "leads_isDeleted_idx" ON public.leads USING btree ("isDeleted");


--
-- Name: leads_leadCode_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "leads_leadCode_key" ON public.leads USING btree ("leadCode");


--
-- Name: leads_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX leads_status_idx ON public.leads USING btree (status);


--
-- Name: notifications_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "notifications_userId_createdAt_idx" ON public.notifications USING btree ("userId", "createdAt");


--
-- Name: permissions_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX permissions_key_key ON public.permissions USING btree (key);


--
-- Name: roles_key_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX roles_key_key ON public.roles USING btree (key);


--
-- Name: users_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX users_email_key ON public.users USING btree (email);


--
-- Name: assignment_history assignment_history_assignedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_history
    ADD CONSTRAINT "assignment_history_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: assignment_history assignment_history_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assignment_history
    ADD CONSTRAINT "assignment_history_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: follow_ups follow_ups_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT "follow_ups_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: follow_ups follow_ups_ownerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.follow_ups
    ADD CONSTRAINT "follow_ups_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lead_history lead_history_actorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_history
    ADD CONSTRAINT "lead_history_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lead_history lead_history_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_history
    ADD CONSTRAINT "lead_history_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lead_notes lead_notes_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_notes
    ADD CONSTRAINT "lead_notes_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: lead_notes lead_notes_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lead_notes
    ADD CONSTRAINT "lead_notes_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public.leads(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: leads leads_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "leads_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: leads leads_currentAssigneeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT "leads_currentAssigneeId_fkey" FOREIGN KEY ("currentAssigneeId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: notifications notifications_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_permissionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES public.permissions(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: role_permissions role_permissions_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.role_permissions
    ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: users users_managerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_managerId_fkey" FOREIGN KEY ("managerId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: users users_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.roles(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict 9vRtboMNshw3DKinhJs4OMDfOpT41LTPYbKgFgCrfiXzxdBvspmuwu5PrjOEC2c

