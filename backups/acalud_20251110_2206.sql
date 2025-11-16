--
-- PostgreSQL database dump
--

\restrict X7htvhaJH8hZFV5OM7jx2GWJOxRKoirAFs3V5ztmT24VCBxudXctjwXnV7ub8rI

-- Dumped from database version 15.14
-- Dumped by pg_dump version 15.14

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: achievements_category_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.achievements_category_enum AS ENUM (
    'beginner',
    'intermediate',
    'advanced',
    'master'
);


ALTER TYPE public.achievements_category_enum OWNER TO postgres;

--
-- Name: achievements_rarity_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.achievements_rarity_enum AS ENUM (
    'common',
    'rare',
    'epic',
    'legendary'
);


ALTER TYPE public.achievements_rarity_enum OWNER TO postgres;

--
-- Name: achievements_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.achievements_type_enum AS ENUM (
    'progress',
    'special',
    'social',
    'academic',
    'activities_completed',
    'experience_gained',
    'level_reached',
    'classrooms_joined',
    'perfect_score',
    'streak'
);


ALTER TYPE public.achievements_type_enum OWNER TO postgres;

--
-- Name: activities_difficulty_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.activities_difficulty_enum AS ENUM (
    'easy',
    'medium',
    'hard',
    'expert'
);


ALTER TYPE public.activities_difficulty_enum OWNER TO postgres;

--
-- Name: activities_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.activities_type_enum AS ENUM (
    'quiz',
    'game',
    'assignment',
    'interactive',
    'drag-drop',
    'memory'
);


ALTER TYPE public.activities_type_enum OWNER TO postgres;

--
-- Name: activity_library_category_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.activity_library_category_enum AS ENUM (
    'mathematics',
    'science',
    'language',
    'history',
    'geography',
    'art',
    'music',
    'physical_education',
    'technology',
    'other'
);


ALTER TYPE public.activity_library_category_enum OWNER TO postgres;

--
-- Name: activity_library_difficultylevel_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.activity_library_difficultylevel_enum AS ENUM (
    'beginner',
    'intermediate',
    'advanced',
    'expert'
);


ALTER TYPE public.activity_library_difficultylevel_enum OWNER TO postgres;

--
-- Name: activity_library_visibility_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.activity_library_visibility_enum AS ENUM (
    'private',
    'public',
    'under_review',
    'rejected',
    'featured'
);


ALTER TYPE public.activity_library_visibility_enum OWNER TO postgres;

--
-- Name: contacts_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contacts_status_enum AS ENUM (
    'pending',
    'in_progress',
    'resolved',
    'closed'
);


ALTER TYPE public.contacts_status_enum OWNER TO postgres;

--
-- Name: contacts_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.contacts_type_enum AS ENUM (
    'general',
    'support',
    'complaint',
    'suggestion',
    'bug_report',
    'feature_request'
);


ALTER TYPE public.contacts_type_enum OWNER TO postgres;

--
-- Name: game_results_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.game_results_status_enum AS ENUM (
    'in_progress',
    'completed',
    'abandoned',
    'paused'
);


ALTER TYPE public.game_results_status_enum OWNER TO postgres;

--
-- Name: games_difficulty_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.games_difficulty_enum AS ENUM (
    'beginner',
    'intermediate',
    'advanced'
);


ALTER TYPE public.games_difficulty_enum OWNER TO postgres;

--
-- Name: games_educationlevel_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.games_educationlevel_enum AS ENUM (
    'primary',
    'secondary'
);


ALTER TYPE public.games_educationlevel_enum OWNER TO postgres;

--
-- Name: games_subject_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.games_subject_enum AS ENUM (
    'mathematics',
    'history',
    'literature',
    'sciences',
    'geography',
    'language'
);


ALTER TYPE public.games_subject_enum OWNER TO postgres;

--
-- Name: games_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.games_type_enum AS ENUM (
    'crossword',
    'trivia',
    'simulation'
);


ALTER TYPE public.games_type_enum OWNER TO postgres;

--
-- Name: institutions_size_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.institutions_size_enum AS ENUM (
    'small',
    'medium',
    'large',
    'enterprise'
);


ALTER TYPE public.institutions_size_enum OWNER TO postgres;

--
-- Name: institutions_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.institutions_status_enum AS ENUM (
    'active',
    'suspended',
    'trial',
    'expired',
    'cancelled',
    'pending_activation'
);


ALTER TYPE public.institutions_status_enum OWNER TO postgres;

--
-- Name: institutions_subscriptionplan_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.institutions_subscriptionplan_enum AS ENUM (
    'free',
    'basic',
    'standard',
    'premium',
    'enterprise',
    'custom'
);


ALTER TYPE public.institutions_subscriptionplan_enum OWNER TO postgres;

--
-- Name: institutions_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.institutions_type_enum AS ENUM (
    'university',
    'college',
    'school',
    'academy',
    'training_center',
    'corporate',
    'government',
    'ngo',
    'other'
);


ALTER TYPE public.institutions_type_enum OWNER TO postgres;

--
-- Name: notifications_priority_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notifications_priority_enum AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE public.notifications_priority_enum OWNER TO postgres;

--
-- Name: notifications_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.notifications_type_enum AS ENUM (
    'activity_assigned',
    'activity_completed',
    'activity_due_soon',
    'activity_overdue',
    'achievement_unlocked',
    'level_up',
    'points_earned',
    'badge_earned',
    'classroom_joined',
    'classroom_announcement',
    'student_joined_classroom',
    'new_classroom_activity',
    'system_announcement',
    'account_verified',
    'password_changed',
    'profile_updated',
    'new_message',
    'comment_received',
    'mention_received',
    'weekly_report',
    'monthly_report',
    'progress_update'
);


ALTER TYPE public.notifications_type_enum OWNER TO postgres;

--
-- Name: password_recoveries_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.password_recoveries_status_enum AS ENUM (
    'active',
    'used',
    'expired',
    'revoked'
);


ALTER TYPE public.password_recoveries_status_enum OWNER TO postgres;

--
-- Name: password_recoveries_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.password_recoveries_type_enum AS ENUM (
    'password_reset',
    'email_verification',
    'account_activation'
);


ALTER TYPE public.password_recoveries_type_enum OWNER TO postgres;

--
-- Name: questions_difficulty_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.questions_difficulty_enum AS ENUM (
    'beginner',
    'intermediate',
    'advanced'
);


ALTER TYPE public.questions_difficulty_enum OWNER TO postgres;

--
-- Name: questions_educationlevel_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.questions_educationlevel_enum AS ENUM (
    'primary',
    'secondary'
);


ALTER TYPE public.questions_educationlevel_enum OWNER TO postgres;

--
-- Name: questions_subject_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.questions_subject_enum AS ENUM (
    'mathematics',
    'history',
    'literature',
    'sciences',
    'geography',
    'language'
);


ALTER TYPE public.questions_subject_enum OWNER TO postgres;

--
-- Name: questions_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.questions_type_enum AS ENUM (
    'multiple_choice',
    'true_false',
    'fill_blank',
    'crossword_clue',
    'simulation_choice'
);


ALTER TYPE public.questions_type_enum OWNER TO postgres;

--
-- Name: reports_severity_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.reports_severity_enum AS ENUM (
    'low',
    'medium',
    'high',
    'critical'
);


ALTER TYPE public.reports_severity_enum OWNER TO postgres;

--
-- Name: reports_status_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.reports_status_enum AS ENUM (
    'pending',
    'reviewing',
    'resolved',
    'rejected',
    'closed'
);


ALTER TYPE public.reports_status_enum OWNER TO postgres;

--
-- Name: reports_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.reports_type_enum AS ENUM (
    'inappropriate_content',
    'spam',
    'plagiarism',
    'misinformation',
    'harassment',
    'copyright',
    'other'
);


ALTER TYPE public.reports_type_enum OWNER TO postgres;

--
-- Name: store_items_availability_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.store_items_availability_enum AS ENUM (
    'available',
    'limited_time',
    'seasonal',
    'event_exclusive',
    'achievement_locked',
    'level_locked',
    'disabled',
    'retired'
);


ALTER TYPE public.store_items_availability_enum OWNER TO postgres;

--
-- Name: store_items_rarity_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.store_items_rarity_enum AS ENUM (
    'common',
    'uncommon',
    'rare',
    'epic',
    'legendary',
    'limited'
);


ALTER TYPE public.store_items_rarity_enum OWNER TO postgres;

--
-- Name: store_items_type_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.store_items_type_enum AS ENUM (
    'avatar',
    'avatar_accessory',
    'avatar_clothing',
    'avatar_background',
    'theme',
    'emote',
    'sound_pack',
    'celebration',
    'frame',
    'badge',
    'other'
);


ALTER TYPE public.store_items_type_enum OWNER TO postgres;

--
-- Name: user_inventory_itemtype_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_inventory_itemtype_enum AS ENUM (
    'avatar',
    'theme',
    'badge',
    'decoration',
    'frame',
    'power_up'
);


ALTER TYPE public.user_inventory_itemtype_enum OWNER TO postgres;

--
-- Name: user_inventory_rarity_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_inventory_rarity_enum AS ENUM (
    'common',
    'rare',
    'epic',
    'legendary'
);


ALTER TYPE public.user_inventory_rarity_enum OWNER TO postgres;

--
-- Name: user_profiles_language_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_profiles_language_enum AS ENUM (
    'es',
    'en',
    'fr',
    'pt'
);


ALTER TYPE public.user_profiles_language_enum OWNER TO postgres;

--
-- Name: user_profiles_privacylevel_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_profiles_privacylevel_enum AS ENUM (
    'public',
    'friends',
    'private'
);


ALTER TYPE public.user_profiles_privacylevel_enum OWNER TO postgres;

--
-- Name: user_profiles_theme_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_profiles_theme_enum AS ENUM (
    'light',
    'dark',
    'auto',
    'blue',
    'green',
    'purple'
);


ALTER TYPE public.user_profiles_theme_enum OWNER TO postgres;

--
-- Name: user_purchases_paymentmethod_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_purchases_paymentmethod_enum AS ENUM (
    'coins',
    'achievement',
    'gift',
    'promotion',
    'admin_grant'
);


ALTER TYPE public.user_purchases_paymentmethod_enum OWNER TO postgres;

--
-- Name: user_purchases_purchasestatus_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.user_purchases_purchasestatus_enum AS ENUM (
    'pending',
    'completed',
    'failed',
    'refunded',
    'cancelled'
);


ALTER TYPE public.user_purchases_purchasestatus_enum OWNER TO postgres;

--
-- Name: users_role_enum; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.users_role_enum AS ENUM (
    'teacher',
    'student',
    'admin'
);


ALTER TYPE public.users_role_enum OWNER TO postgres;

--
-- Name: generate_uuid(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.generate_uuid() RETURNS uuid
    LANGUAGE plpgsql
    AS $$
BEGIN
    RETURN uuid_generate_v4();
END;
$$;


ALTER FUNCTION public.generate_uuid() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.achievements (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying NOT NULL,
    description text NOT NULL,
    identifier character varying NOT NULL,
    icon character varying NOT NULL,
    type public.achievements_type_enum NOT NULL,
    category public.achievements_category_enum NOT NULL,
    rarity public.achievements_rarity_enum NOT NULL,
    requirement jsonb NOT NULL,
    criteria jsonb DEFAULT '{}'::jsonb NOT NULL,
    points integer DEFAULT 10 NOT NULL,
    reward jsonb NOT NULL,
    rewards jsonb NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.achievements OWNER TO postgres;

--
-- Name: activities; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activities (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying NOT NULL,
    description text NOT NULL,
    type public.activities_type_enum NOT NULL,
    difficulty public.activities_difficulty_enum NOT NULL,
    subject character varying NOT NULL,
    content jsonb NOT NULL,
    rewards jsonb NOT NULL,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    "estimatedTime" integer DEFAULT 15 NOT NULL,
    "baseExperience" integer DEFAULT 100 NOT NULL,
    "dueDate" timestamp without time zone,
    "maxAttempts" integer,
    "isPublic" boolean DEFAULT false NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "classroomId" uuid,
    "createdById" uuid NOT NULL
);


ALTER TABLE public.activities OWNER TO postgres;

--
-- Name: activity_completions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_completions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    score integer NOT NULL,
    "maxScore" integer NOT NULL,
    "timeSpent" integer NOT NULL,
    attempts integer DEFAULT 1 NOT NULL,
    answers jsonb NOT NULL,
    "completedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "studentId" uuid NOT NULL,
    "activityId" uuid NOT NULL
);


ALTER TABLE public.activity_completions OWNER TO postgres;

--
-- Name: activity_library; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_library (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "authorId" uuid NOT NULL,
    "originalActivityId" uuid NOT NULL,
    "publicTitle" character varying(200) NOT NULL,
    "publicDescription" text NOT NULL,
    category public.activity_library_category_enum DEFAULT 'other'::public.activity_library_category_enum NOT NULL,
    "difficultyLevel" public.activity_library_difficultylevel_enum DEFAULT 'beginner'::public.activity_library_difficultylevel_enum NOT NULL,
    visibility public.activity_library_visibility_enum DEFAULT 'private'::public.activity_library_visibility_enum NOT NULL,
    "recommendedAgeMin" integer,
    "recommendedAgeMax" integer,
    "estimatedDurationMinutes" integer,
    "recommendedStudentsMin" integer,
    "recommendedStudentsMax" integer,
    "requiredMaterials" json,
    "learningObjectives" json,
    "teacherInstructions" text,
    "averageRating" numeric(3,2) DEFAULT '0'::numeric NOT NULL,
    "totalRatings" integer DEFAULT 0 NOT NULL,
    "totalCopies" integer DEFAULT 0 NOT NULL,
    "totalViews" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "rejectionReason" text,
    "reviewedBy" uuid,
    "reviewedAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activity_library OWNER TO postgres;

--
-- Name: activity_ratings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_ratings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "libraryActivityId" uuid NOT NULL,
    rating integer NOT NULL,
    comment text,
    "isActive" boolean DEFAULT true NOT NULL,
    "isReported" boolean DEFAULT false NOT NULL,
    "helpfulVotes" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activity_ratings OWNER TO postgres;

--
-- Name: activity_tags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_tags (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "libraryActivityId" uuid NOT NULL,
    "tagName" character varying(50) NOT NULL,
    color character varying(7) DEFAULT '#007bff'::character varying NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.activity_tags OWNER TO postgres;

--
-- Name: classroom_students; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classroom_students (
    "classroomId" uuid NOT NULL,
    "studentId" uuid NOT NULL
);


ALTER TABLE public.classroom_students OWNER TO postgres;

--
-- Name: classrooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.classrooms (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying NOT NULL,
    description text NOT NULL,
    subject character varying NOT NULL,
    grade character varying NOT NULL,
    "inviteCode" character varying NOT NULL,
    color character varying DEFAULT '#6366f1'::character varying NOT NULL,
    "coverImage" character varying,
    settings jsonb DEFAULT '{}'::jsonb NOT NULL,
    level character varying(20) DEFAULT 'intermedio'::character varying NOT NULL,
    timezone character varying(60) DEFAULT 'America/Santiago'::character varying NOT NULL,
    language character varying(5) DEFAULT 'es'::character varying NOT NULL,
    tags text[],
    "invitedStudentEmails" text[],
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "teacherId" uuid NOT NULL
);


ALTER TABLE public.classrooms OWNER TO postgres;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(20),
    type public.contacts_type_enum DEFAULT 'general'::public.contacts_type_enum NOT NULL,
    subject character varying(200) NOT NULL,
    message text NOT NULL,
    status public.contacts_status_enum DEFAULT 'pending'::public.contacts_status_enum NOT NULL,
    "ipAddress" character varying(45),
    "userAgent" text,
    "adminResponse" text,
    "processedByAdminId" uuid,
    "processedAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.contacts OWNER TO postgres;

--
-- Name: crossword_puzzles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.crossword_puzzles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "gameId" uuid NOT NULL,
    title character varying NOT NULL,
    description text,
    "gridRows" integer DEFAULT 15 NOT NULL,
    "gridCols" integer DEFAULT 15 NOT NULL,
    grid jsonb NOT NULL,
    words jsonb NOT NULL,
    "horizontalClues" jsonb NOT NULL,
    "verticalClues" jsonb NOT NULL,
    "difficultySettings" jsonb DEFAULT '{}'::jsonb NOT NULL,
    status character varying DEFAULT 'active'::character varying NOT NULL,
    "estimatedTime" integer DEFAULT 15 NOT NULL,
    "wordCount" integer DEFAULT 0 NOT NULL,
    density numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    tags text DEFAULT '[]'::text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.crossword_puzzles OWNER TO postgres;

--
-- Name: game_comments; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_comments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "gameId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    content text NOT NULL,
    "isVisible" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.game_comments OWNER TO postgres;

--
-- Name: game_ratings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_ratings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "gameId" uuid NOT NULL,
    "userId" uuid NOT NULL,
    rating integer NOT NULL,
    review text,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.game_ratings OWNER TO postgres;

--
-- Name: game_results; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.game_results (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "gameId" uuid NOT NULL,
    score integer DEFAULT 0 NOT NULL,
    "maxScore" integer NOT NULL,
    accuracy numeric(5,2) DEFAULT '0'::numeric NOT NULL,
    "timeSpent" integer DEFAULT 0 NOT NULL,
    status public.game_results_status_enum DEFAULT 'in_progress'::public.game_results_status_enum NOT NULL,
    "startedAt" timestamp without time zone NOT NULL,
    "completedAt" timestamp without time zone,
    "correctAnswers" integer DEFAULT 0 NOT NULL,
    "totalAnswers" integer DEFAULT 0 NOT NULL,
    "detailedAnswers" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "gameProgress" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "achievementsUnlocked" text DEFAULT '[]'::text NOT NULL,
    bonuses jsonb DEFAULT '{}'::jsonb NOT NULL,
    device character varying DEFAULT 'web'::character varying NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.game_results OWNER TO postgres;

--
-- Name: games; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.games (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    title character varying NOT NULL,
    description text,
    type public.games_type_enum NOT NULL,
    subject public.games_subject_enum NOT NULL,
    difficulty public.games_difficulty_enum DEFAULT 'beginner'::public.games_difficulty_enum NOT NULL,
    "educationLevel" public.games_educationlevel_enum NOT NULL,
    "maxPoints" integer DEFAULT 100 NOT NULL,
    "timeLimit" integer,
    "gameConfig" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdById" uuid NOT NULL,
    "imageUrl" character varying,
    tags text DEFAULT '[]'::text NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.games OWNER TO postgres;

--
-- Name: institutions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.institutions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(200) NOT NULL,
    "shortName" character varying(50),
    description text,
    type public.institutions_type_enum NOT NULL,
    size public.institutions_size_enum DEFAULT 'small'::public.institutions_size_enum NOT NULL,
    domain character varying(100),
    "contactEmail" character varying(100) NOT NULL,
    "contactPhone" character varying(20),
    website character varying(200),
    address text,
    city character varying(100),
    state character varying(100),
    "postalCode" character varying(20),
    country character varying(100),
    timezone character varying(50) DEFAULT 'UTC'::character varying NOT NULL,
    status public.institutions_status_enum DEFAULT 'trial'::public.institutions_status_enum NOT NULL,
    "subscriptionPlan" public.institutions_subscriptionplan_enum DEFAULT 'free'::public.institutions_subscriptionplan_enum NOT NULL,
    "subscriptionStartDate" timestamp without time zone,
    "subscriptionEndDate" timestamp without time zone,
    "subscriptionLimits" json NOT NULL,
    "isTrialActive" boolean DEFAULT true NOT NULL,
    "trialDaysRemaining" integer DEFAULT 30 NOT NULL,
    settings json NOT NULL,
    "allowSelfRegistration" boolean DEFAULT false NOT NULL,
    "requireApproval" boolean DEFAULT true NOT NULL,
    "allowedEmailDomains" json DEFAULT '[]'::json NOT NULL,
    "availableRoles" json NOT NULL,
    statistics json NOT NULL,
    "statisticsLastUpdated" timestamp without time zone,
    "totalUsers" integer DEFAULT 0 NOT NULL,
    "activeUsers" integer DEFAULT 0 NOT NULL,
    "totalStorageUsed" bigint DEFAULT '0'::bigint NOT NULL,
    "billingInfo" json,
    "apiKey" character varying(64),
    webhooks json DEFAULT '[]'::json NOT NULL,
    metadata json DEFAULT '{}'::json NOT NULL,
    tags json DEFAULT '[]'::json NOT NULL,
    "internalNotes" text,
    "createdById" character varying,
    "lastModifiedById" character varying,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "deletedAt" timestamp without time zone
);


ALTER TABLE public.institutions OWNER TO postgres;

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type public.notifications_type_enum NOT NULL,
    title character varying(100) NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    priority public.notifications_priority_enum DEFAULT 'medium'::public.notifications_priority_enum NOT NULL,
    channels text DEFAULT '["in_app"]'::text NOT NULL,
    recipient_id uuid NOT NULL,
    sender_id uuid,
    "isRead" boolean DEFAULT false NOT NULL,
    "readAt" timestamp with time zone,
    "isSent" boolean DEFAULT false NOT NULL,
    "sentAt" timestamp with time zone,
    "sendAttempts" integer DEFAULT 0 NOT NULL,
    "sendErrors" jsonb,
    "expiresAt" timestamp with time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.notifications OWNER TO postgres;

--
-- Name: COLUMN notifications.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.type IS 'Tipo especﾃｭfico de la notificaciﾃｳn para categorizaciﾃｳn y filtrado';


--
-- Name: COLUMN notifications.title; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.title IS 'Tﾃｭtulo conciso de la notificaciﾃｳn, visible en listas y previews';


--
-- Name: COLUMN notifications.message; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.message IS 'Contenido completo de la notificaciﾃｳn con detalles';


--
-- Name: COLUMN notifications.metadata; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.metadata IS 'Datos adicionales especﾃｭficos del tipo de notificaciﾃｳn (IDs, URLs, etc.)';


--
-- Name: COLUMN notifications.priority; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.priority IS 'Prioridad para ordenamiento y presentaciﾃｳn visual';


--
-- Name: COLUMN notifications.channels; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.channels IS 'Lista de canales por los que se enviarﾃ｡ la notificaciﾃｳn';


--
-- Name: COLUMN notifications."isRead"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications."isRead" IS 'Indica si el usuario ya leyﾃｳ la notificaciﾃｳn';


--
-- Name: COLUMN notifications."readAt"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications."readAt" IS 'Timestamp de cuando se marcﾃｳ como leﾃｭda';


--
-- Name: COLUMN notifications."isSent"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications."isSent" IS 'Indica si la notificaciﾃｳn fue enviada a todos los canales';


--
-- Name: COLUMN notifications."sentAt"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications."sentAt" IS 'Timestamp de cuando se enviﾃｳ por ﾃｺltima vez';


--
-- Name: COLUMN notifications."sendAttempts"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications."sendAttempts" IS 'Contador de intentos de envﾃｭo para retry logic';


--
-- Name: COLUMN notifications."sendErrors"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications."sendErrors" IS 'Informaciﾃｳn sobre errores de envﾃｭo por canal';


--
-- Name: COLUMN notifications."expiresAt"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications."expiresAt" IS 'Fecha despuﾃｩs de la cual la notificaciﾃｳn no es relevante';


--
-- Name: COLUMN notifications.created_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.created_at IS 'Timestamp de creaciﾃｳn de la notificaciﾃｳn';


--
-- Name: COLUMN notifications.updated_at; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.notifications.updated_at IS 'Timestamp de ﾃｺltima modificaciﾃｳn';


--
-- Name: password_recoveries; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_recoveries (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    token character varying(128) NOT NULL,
    type public.password_recoveries_type_enum DEFAULT 'password_reset'::public.password_recoveries_type_enum NOT NULL,
    status public.password_recoveries_status_enum DEFAULT 'active'::public.password_recoveries_status_enum NOT NULL,
    "expiresAt" timestamp without time zone NOT NULL,
    "ipAddress" character varying(45),
    "userAgent" text,
    "usedAt" timestamp without time zone,
    "usedFromIp" character varying(45),
    "attemptCount" integer DEFAULT 0 NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL,
    user_id uuid
);


ALTER TABLE public.password_recoveries OWNER TO postgres;

--
-- Name: questions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.questions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "questionText" text NOT NULL,
    type public.questions_type_enum NOT NULL,
    options jsonb DEFAULT '[]'::jsonb NOT NULL,
    "correctAnswer" jsonb NOT NULL,
    explanation text,
    points integer DEFAULT 10 NOT NULL,
    "timeLimit" integer,
    subject public.questions_subject_enum NOT NULL,
    difficulty public.questions_difficulty_enum DEFAULT 'beginner'::public.questions_difficulty_enum NOT NULL,
    "educationLevel" public.questions_educationlevel_enum NOT NULL,
    tags text DEFAULT '[]'::text NOT NULL,
    "crosswordData" jsonb,
    "simulationData" jsonb,
    "gameId" uuid NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.questions OWNER TO postgres;

--
-- Name: reports; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.reports (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    type public.reports_type_enum NOT NULL,
    reason character varying(200) NOT NULL,
    description text NOT NULL,
    severity public.reports_severity_enum DEFAULT 'medium'::public.reports_severity_enum NOT NULL,
    status public.reports_status_enum DEFAULT 'pending'::public.reports_status_enum NOT NULL,
    "reporterId" uuid NOT NULL,
    "reportedActivityId" uuid,
    "moderatorId" uuid,
    "moderatorNotes" text,
    "actionTaken" character varying(500),
    "reviewedAt" timestamp without time zone,
    "ipAddress" character varying(45),
    "userAgent" character varying(500),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.reports OWNER TO postgres;

--
-- Name: COLUMN reports.type; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reports.type IS 'Tipo de problema reportado';


--
-- Name: COLUMN reports.reason; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reports.reason IS 'Resumen breve del problema';


--
-- Name: COLUMN reports.description; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reports.description IS 'Descripciﾃｳn detallada del problema reportado';


--
-- Name: COLUMN reports.severity; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reports.severity IS 'Nivel de gravedad del problema';


--
-- Name: COLUMN reports.status; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reports.status IS 'Estado actual del reporte';


--
-- Name: COLUMN reports."moderatorNotes"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reports."moderatorNotes" IS 'Notas internas del moderador';


--
-- Name: COLUMN reports."actionTaken"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reports."actionTaken" IS 'Acciﾃｳn concreta tomada por el moderador';


--
-- Name: COLUMN reports."reviewedAt"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reports."reviewedAt" IS 'Fecha de revisiﾃｳn por el moderador';


--
-- Name: COLUMN reports."ipAddress"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reports."ipAddress" IS 'IP del usuario que reportﾃｳ (para detecciﾃｳn de spam)';


--
-- Name: COLUMN reports."userAgent"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reports."userAgent" IS 'User-Agent del reportero';


--
-- Name: COLUMN reports."createdAt"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reports."createdAt" IS 'Fecha de creaciﾃｳn del reporte';


--
-- Name: COLUMN reports."updatedAt"; Type: COMMENT; Schema: public; Owner: postgres
--

COMMENT ON COLUMN public.reports."updatedAt" IS 'Fecha de ﾃｺltima actualizaciﾃｳn';


--
-- Name: simulations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.simulations (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "gameId" uuid NOT NULL,
    title character varying NOT NULL,
    description text NOT NULL,
    setting character varying NOT NULL,
    "educationalObjective" text NOT NULL,
    "startingSceneId" character varying NOT NULL,
    scenes jsonb NOT NULL,
    characters jsonb NOT NULL,
    "estimatedDuration" integer DEFAULT 20 NOT NULL,
    "maxScore" integer DEFAULT 100 NOT NULL,
    "minDecisions" integer DEFAULT 5 NOT NULL,
    resources jsonb DEFAULT '[]'::jsonb NOT NULL,
    "evaluationCriteria" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "reflectionQuestions" jsonb DEFAULT '[]'::jsonb NOT NULL,
    "adaptiveSettings" jsonb DEFAULT '{}'::jsonb NOT NULL,
    tags text DEFAULT '[]'::text NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.simulations OWNER TO postgres;

--
-- Name: store_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.store_items (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(100) NOT NULL,
    description text NOT NULL,
    type public.store_items_type_enum DEFAULT 'other'::public.store_items_type_enum NOT NULL,
    rarity public.store_items_rarity_enum DEFAULT 'common'::public.store_items_rarity_enum NOT NULL,
    availability public.store_items_availability_enum DEFAULT 'available'::public.store_items_availability_enum NOT NULL,
    price integer NOT NULL,
    "originalPrice" integer,
    "imageUrl" character varying(500) NOT NULL,
    "additionalImages" json,
    "itemData" json,
    tags text[] DEFAULT '{}'::text[] NOT NULL,
    "minLevelRequired" integer DEFAULT 1 NOT NULL,
    "requiredAchievements" text[] DEFAULT '{}'::text[],
    "availableFrom" timestamp without time zone,
    "availableUntil" timestamp without time zone,
    "stockLimit" integer,
    "soldCount" integer DEFAULT 0 NOT NULL,
    "maxPerUser" integer,
    "isFeatured" boolean DEFAULT false NOT NULL,
    "isOnSale" boolean DEFAULT false NOT NULL,
    "discountPercentage" integer DEFAULT 0 NOT NULL,
    "displayOrder" integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    metadata json,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.store_items OWNER TO postgres;

--
-- Name: user_achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_achievements (
    "userId" uuid NOT NULL,
    "achievementId" uuid NOT NULL
);


ALTER TABLE public.user_achievements OWNER TO postgres;

--
-- Name: user_inventory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_inventory (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "itemId" character varying NOT NULL,
    "itemName" character varying NOT NULL,
    description text NOT NULL,
    "itemType" public.user_inventory_itemtype_enum NOT NULL,
    icon character varying NOT NULL,
    rarity public.user_inventory_rarity_enum NOT NULL,
    category character varying NOT NULL,
    "pricePaid" integer NOT NULL,
    "itemData" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "isEquipped" boolean DEFAULT false NOT NULL,
    "purchasedAt" timestamp without time zone DEFAULT now() NOT NULL,
    "userId" uuid NOT NULL
);


ALTER TABLE public.user_inventory OWNER TO postgres;

--
-- Name: user_profile_audits; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profile_audits (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    actor_user_id uuid,
    operation character varying(64) NOT NULL,
    snapshot_before jsonb,
    snapshot_after jsonb,
    changes jsonb,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_profile_audits OWNER TO postgres;

--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_profiles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    user_id uuid NOT NULL,
    "displayName" character varying(100),
    bio text,
    "birthDate" date,
    location character varying(100),
    website character varying(255),
    "socialLinks" json,
    "avatarUrl" character varying(500),
    "coverImageUrl" character varying(500),
    theme public.user_profiles_theme_enum DEFAULT 'auto'::public.user_profiles_theme_enum NOT NULL,
    "primaryColor" character varying(7),
    "fontSettings" json,
    "isPublic" boolean DEFAULT true NOT NULL,
    "privacyLevel" public.user_profiles_privacylevel_enum DEFAULT 'public'::public.user_profiles_privacylevel_enum NOT NULL,
    "privacySettings" json DEFAULT '{}'::json NOT NULL,
    language public.user_profiles_language_enum DEFAULT 'es'::public.user_profiles_language_enum NOT NULL,
    timezone character varying(50),
    "notificationSettings" json DEFAULT '{}'::json NOT NULL,
    "accessibilitySettings" json,
    stats json DEFAULT '{}'::json NOT NULL,
    "featuredAchievements" json DEFAULT '[]'::json NOT NULL,
    "customBadges" json DEFAULT '[]'::json NOT NULL,
    "lastProfileUpdate" timestamp without time zone,
    "profileViews" integer DEFAULT 0 NOT NULL,
    "isVerified" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_profiles OWNER TO postgres;

--
-- Name: user_purchases; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_purchases (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    "userId" uuid NOT NULL,
    "storeItemId" uuid NOT NULL,
    "purchaseStatus" public.user_purchases_purchasestatus_enum DEFAULT 'pending'::public.user_purchases_purchasestatus_enum NOT NULL,
    "paymentMethod" public.user_purchases_paymentmethod_enum DEFAULT 'coins'::public.user_purchases_paymentmethod_enum NOT NULL,
    "pricePaid" integer NOT NULL,
    "originalPriceAtPurchase" integer NOT NULL,
    "discountApplied" integer DEFAULT 0 NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    "isEquipped" boolean DEFAULT false NOT NULL,
    "equippedAt" timestamp without time zone,
    "purchaseData" json,
    "transactionId" character varying(100),
    notes text,
    "isGift" boolean DEFAULT false NOT NULL,
    "giftFromUserId" uuid,
    "giftMessage" text,
    "expiresAt" timestamp without time zone,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.user_purchases OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying NOT NULL,
    "firstName" character varying NOT NULL,
    "lastName" character varying NOT NULL,
    name character varying NOT NULL,
    "dateOfBirth" date,
    bio text,
    password character varying NOT NULL,
    role public.users_role_enum DEFAULT 'student'::public.users_role_enum NOT NULL,
    avatar character varying,
    coins integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    experience integer DEFAULT 0 NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "lastLoginAt" timestamp without time zone,
    "loginAttempts" integer DEFAULT 0 NOT NULL,
    "lockedUntil" timestamp without time zone,
    preferences jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Data for Name: achievements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.achievements (id, title, description, identifier, icon, type, category, rarity, requirement, criteria, points, reward, rewards, "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: activities; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activities (id, title, description, type, difficulty, subject, content, rewards, tags, "estimatedTime", "baseExperience", "dueDate", "maxAttempts", "isPublic", "isActive", settings, "createdAt", "updatedAt", "classroomId", "createdById") FROM stdin;
\.


--
-- Data for Name: activity_completions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_completions (id, score, "maxScore", "timeSpent", attempts, answers, "completedAt", "studentId", "activityId") FROM stdin;
\.


--
-- Data for Name: activity_library; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_library (id, "authorId", "originalActivityId", "publicTitle", "publicDescription", category, "difficultyLevel", visibility, "recommendedAgeMin", "recommendedAgeMax", "estimatedDurationMinutes", "recommendedStudentsMin", "recommendedStudentsMax", "requiredMaterials", "learningObjectives", "teacherInstructions", "averageRating", "totalRatings", "totalCopies", "totalViews", "isActive", "isFeatured", "rejectionReason", "reviewedBy", "reviewedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: activity_ratings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_ratings (id, "userId", "libraryActivityId", rating, comment, "isActive", "isReported", "helpfulVotes", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: activity_tags; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.activity_tags (id, "libraryActivityId", "tagName", color, "isActive", "createdAt") FROM stdin;
\.


--
-- Data for Name: classroom_students; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classroom_students ("classroomId", "studentId") FROM stdin;
c241f1e9-3a02-460a-926e-5347a045a7c5	461aa2e1-fdb9-4a3d-b7b6-9ba4ed1ebffb
\.


--
-- Data for Name: classrooms; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.classrooms (id, name, description, subject, grade, "inviteCode", color, "coverImage", settings, level, timezone, language, tags, "invitedStudentEmails", "isActive", "createdAt", "updatedAt", "teacherId") FROM stdin;
c75c7190-84a3-409a-a2f9-032a2aa8a78b	Test Classroom	Test Description	Matemﾃ｡ticas	1ﾂｰ Primaria	KSMECHX9	#6366f1	\N	{"language": "es", "timezone": "America/Santiago", "maxStudents": 50, "notifications": {"newStudent": true, "announcements": true, "activityCompleted": true}, "allowStudentDiscussion": true, "requireApprovalForJoin": false}	intermedio	America/Santiago	es	\N	\N	t	2025-11-05 00:39:27.088	2025-11-05 03:39:27.090301	12689b00-5939-4f58-a3ee-07d48baba899
a69230a7-61bb-4445-b118-ae53c8f7926c	Test Classroom for GET	Test Description	Matemﾃ｡ticas	1ﾂｰ Primaria	YT2TOKAY	#6366f1	\N	{"language": "es", "timezone": "America/Santiago", "maxStudents": 50, "notifications": {"newStudent": true, "announcements": true, "activityCompleted": true}, "allowStudentDiscussion": true, "requireApprovalForJoin": false}	intermedio	America/Santiago	es	\N	\N	t	2025-11-05 00:39:27.139	2025-11-05 03:39:27.141567	12689b00-5939-4f58-a3ee-07d48baba899
c241f1e9-3a02-460a-926e-5347a045a7c5	Test Classroom for Join	Test Description	Matemﾃ｡ticas	1ﾂｰ Primaria	BUJQITPE	#6366f1	\N	{"language": "es", "timezone": "America/Santiago", "maxStudents": 50, "notifications": {"newStudent": true, "announcements": true, "activityCompleted": true}, "allowStudentDiscussion": true, "requireApprovalForJoin": false}	intermedio	America/Santiago	es	\N	\N	t	2025-11-05 00:39:27.186	2025-11-05 03:39:27.188298	12689b00-5939-4f58-a3ee-07d48baba899
\.


--
-- Data for Name: contacts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.contacts (id, name, email, phone, type, subject, message, status, "ipAddress", "userAgent", "adminResponse", "processedByAdminId", "processedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: crossword_puzzles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.crossword_puzzles (id, "gameId", title, description, "gridRows", "gridCols", grid, words, "horizontalClues", "verticalClues", "difficultySettings", status, "estimatedTime", "wordCount", density, tags, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: game_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.game_comments (id, "gameId", "userId", content, "isVisible", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: game_ratings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.game_ratings (id, "gameId", "userId", rating, review, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: game_results; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.game_results (id, "userId", "gameId", score, "maxScore", accuracy, "timeSpent", status, "startedAt", "completedAt", "correctAnswers", "totalAnswers", "detailedAnswers", "gameProgress", "achievementsUnlocked", bonuses, device, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: games; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.games (id, title, description, type, subject, difficulty, "educationLevel", "maxPoints", "timeLimit", "gameConfig", "isActive", "createdById", "imageUrl", tags, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: institutions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.institutions (id, code, name, "shortName", description, type, size, domain, "contactEmail", "contactPhone", website, address, city, state, "postalCode", country, timezone, status, "subscriptionPlan", "subscriptionStartDate", "subscriptionEndDate", "subscriptionLimits", "isTrialActive", "trialDaysRemaining", settings, "allowSelfRegistration", "requireApproval", "allowedEmailDomains", "availableRoles", statistics, "statisticsLastUpdated", "totalUsers", "activeUsers", "totalStorageUsed", "billingInfo", "apiKey", webhooks, metadata, tags, "internalNotes", "createdById", "lastModifiedById", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifications (id, type, title, message, metadata, priority, channels, recipient_id, sender_id, "isRead", "readAt", "isSent", "sentAt", "sendAttempts", "sendErrors", "expiresAt", created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: password_recoveries; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_recoveries (id, token, type, status, "expiresAt", "ipAddress", "userAgent", "usedAt", "usedFromIp", "attemptCount", "createdAt", "updatedAt", user_id) FROM stdin;
\.


--
-- Data for Name: questions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.questions (id, "questionText", type, options, "correctAnswer", explanation, points, "timeLimit", subject, difficulty, "educationLevel", tags, "crosswordData", "simulationData", "gameId", "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.reports (id, type, reason, description, severity, status, "reporterId", "reportedActivityId", "moderatorId", "moderatorNotes", "actionTaken", "reviewedAt", "ipAddress", "userAgent", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: simulations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.simulations (id, "gameId", title, description, setting, "educationalObjective", "startingSceneId", scenes, characters, "estimatedDuration", "maxScore", "minDecisions", resources, "evaluationCriteria", "reflectionQuestions", "adaptiveSettings", tags, "isActive", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: store_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.store_items (id, name, description, type, rarity, availability, price, "originalPrice", "imageUrl", "additionalImages", "itemData", tags, "minLevelRequired", "requiredAchievements", "availableFrom", "availableUntil", "stockLimit", "soldCount", "maxPerUser", "isFeatured", "isOnSale", "discountPercentage", "displayOrder", "isActive", metadata, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: user_achievements; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_achievements ("userId", "achievementId") FROM stdin;
\.


--
-- Data for Name: user_inventory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_inventory (id, "itemId", "itemName", description, "itemType", icon, rarity, category, "pricePaid", "itemData", "isEquipped", "purchasedAt", "userId") FROM stdin;
\.


--
-- Data for Name: user_profile_audits; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_profile_audits (id, user_id, actor_user_id, operation, snapshot_before, snapshot_after, changes, metadata, created_at) FROM stdin;
\.


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_profiles (id, user_id, "displayName", bio, "birthDate", location, website, "socialLinks", "avatarUrl", "coverImageUrl", theme, "primaryColor", "fontSettings", "isPublic", "privacyLevel", "privacySettings", language, timezone, "notificationSettings", "accessibilitySettings", stats, "featuredAchievements", "customBadges", "lastProfileUpdate", "profileViews", "isVerified", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: user_purchases; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_purchases (id, "userId", "storeItemId", "purchaseStatus", "paymentMethod", "pricePaid", "originalPriceAtPurchase", "discountApplied", quantity, "isEquipped", "equippedAt", "purchaseData", "transactionId", notes, "isGift", "giftFromUserId", "giftMessage", "expiresAt", "createdAt") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, "firstName", "lastName", name, "dateOfBirth", bio, password, role, avatar, coins, level, experience, "isActive", "lastLoginAt", "loginAttempts", "lockedUntil", preferences, "createdAt", "updatedAt") FROM stdin;
12689b00-5939-4f58-a3ee-07d48baba899	teacher.1762313966478@test.com	Test	Teacher	Test Teacher	\N	\N	$2a$12$kaOzY.DKGvJ6vuoUXB3OteH0VKZG0bjThSOAkAYIwI9DGfXfr/ObW	teacher	\N	0	1	0	t	\N	0	\N	{}	2025-11-05 00:39:26.777	2025-11-05 03:39:26.779204
461aa2e1-fdb9-4a3d-b7b6-9ba4ed1ebffb	student.1762313966787@example.com	Test	Student	Test Student	\N	\N	$2a$12$yCmWfQCSQz6OXUiQE.q7G.6spst9Pp4v8E8Sf/XlCluTlTLIhKi16	student	\N	50	1	0	t	\N	0	\N	{}	2025-11-05 00:39:27.063	2025-11-05 03:39:27.064734
\.


--
-- Name: questions PK_08a6d4b0f49ff300bf3a0ca60ac; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT "PK_08a6d4b0f49ff300bf3a0ca60ac" PRIMARY KEY (id);


--
-- Name: game_ratings PK_0980f9e06888e95075bed835fe6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_ratings
    ADD CONSTRAINT "PK_0980f9e06888e95075bed835fe6" PRIMARY KEY (id);


--
-- Name: institutions PK_0be7539dcdba335470dc05e9690; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT "PK_0be7539dcdba335470dc05e9690" PRIMARY KEY (id);


--
-- Name: store_items PK_0d47463134b9663b18d7df22282; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.store_items
    ADD CONSTRAINT "PK_0d47463134b9663b18d7df22282" PRIMARY KEY (id);


--
-- Name: user_inventory PK_193d6e1b301eda020c2492d3d9c; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_inventory
    ADD CONSTRAINT "PK_193d6e1b301eda020c2492d3d9c" PRIMARY KEY (id);


--
-- Name: achievements PK_1bc19c37c6249f70186f318d71d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT "PK_1bc19c37c6249f70186f318d71d" PRIMARY KEY (id);


--
-- Name: user_profiles PK_1ec6662219f4605723f1e41b6cb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT "PK_1ec6662219f4605723f1e41b6cb" PRIMARY KEY (id);


--
-- Name: classrooms PK_20b7b82896c06eda27548bd0c24; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT "PK_20b7b82896c06eda27548bd0c24" PRIMARY KEY (id);


--
-- Name: activity_tags PK_29ae8793be69c24847ab6cfeff5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_tags
    ADD CONSTRAINT "PK_29ae8793be69c24847ab6cfeff5" PRIMARY KEY (id);


--
-- Name: crossword_puzzles PK_2c96fa25ec86629c23587f34efb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crossword_puzzles
    ADD CONSTRAINT "PK_2c96fa25ec86629c23587f34efb" PRIMARY KEY (id);


--
-- Name: user_purchases PK_4415c40c02391c8376dde9ff1b7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_purchases
    ADD CONSTRAINT "PK_4415c40c02391c8376dde9ff1b7" PRIMARY KEY (id);


--
-- Name: notifications PK_6a72c3c0f683f6462415e653c3a; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY (id);


--
-- Name: activities PK_7f4004429f731ffb9c88eb486a8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT "PK_7f4004429f731ffb9c88eb486a8" PRIMARY KEY (id);


--
-- Name: classroom_students PK_8c482125c4a89c18f69f495d2c2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_students
    ADD CONSTRAINT "PK_8c482125c4a89c18f69f495d2c2" PRIMARY KEY ("classroomId", "studentId");


--
-- Name: activity_library PK_945d677a16209e3b28ba9fbda28; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_library
    ADD CONSTRAINT "PK_945d677a16209e3b28ba9fbda28" PRIMARY KEY (id);


--
-- Name: activity_ratings PK_9f486a86fd182b675e617159a89; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_ratings
    ADD CONSTRAINT "PK_9f486a86fd182b675e617159a89" PRIMARY KEY (id);


--
-- Name: users PK_a3ffb1c0c8416b9fc6f907b7433; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id);


--
-- Name: password_recoveries PK_b854e1e8b1d99bf7ecf0008bc1f; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_recoveries
    ADD CONSTRAINT "PK_b854e1e8b1d99bf7ecf0008bc1f" PRIMARY KEY (id);


--
-- Name: contacts PK_b99cd40cfd66a99f1571f4f72e6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT "PK_b99cd40cfd66a99f1571f4f72e6" PRIMARY KEY (id);


--
-- Name: user_achievements PK_c1acd69cf91b1e353634c152dd7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "PK_c1acd69cf91b1e353634c152dd7" PRIMARY KEY ("userId", "achievementId");


--
-- Name: simulations PK_c6d15083257a1c84ecd67423c30; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulations
    ADD CONSTRAINT "PK_c6d15083257a1c84ecd67423c30" PRIMARY KEY (id);


--
-- Name: activity_completions PK_c7e0d86862474b71d59121f4b52; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_completions
    ADD CONSTRAINT "PK_c7e0d86862474b71d59121f4b52" PRIMARY KEY (id);


--
-- Name: games PK_c9b16b62917b5595af982d66337; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT "PK_c9b16b62917b5595af982d66337" PRIMARY KEY (id);


--
-- Name: game_results PK_d45049161e874555e7cfe325afe; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_results
    ADD CONSTRAINT "PK_d45049161e874555e7cfe325afe" PRIMARY KEY (id);


--
-- Name: reports PK_d9013193989303580053c0b5ef6; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT "PK_d9013193989303580053c0b5ef6" PRIMARY KEY (id);


--
-- Name: game_comments PK_f7d6a427863604c9c3c8553d3c3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_comments
    ADD CONSTRAINT "PK_f7d6a427863604c9c3c8553d3c3" PRIMARY KEY (id);


--
-- Name: crossword_puzzles REL_061edf3c95a985a8975a6f18be; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crossword_puzzles
    ADD CONSTRAINT "REL_061edf3c95a985a8975a6f18be" UNIQUE ("gameId");


--
-- Name: user_profiles REL_6ca9503d77ae39b4b5a6cc3ba8; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT "REL_6ca9503d77ae39b4b5a6cc3ba8" UNIQUE (user_id);


--
-- Name: simulations REL_80f9d5b89f48eb2eb15f03a0cb; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulations
    ADD CONSTRAINT "REL_80f9d5b89f48eb2eb15f03a0cb" UNIQUE ("gameId");


--
-- Name: institutions UQ_1cc0e17b15e64cb50b8ae44bcf7; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT "UQ_1cc0e17b15e64cb50b8ae44bcf7" UNIQUE (domain);


--
-- Name: activity_tags UQ_2184a2e6b65c1d13e45ef160be0; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_tags
    ADD CONSTRAINT "UQ_2184a2e6b65c1d13e45ef160be0" UNIQUE ("libraryActivityId", "tagName");


--
-- Name: institutions UQ_3617f5ad52593fd4355b38d03a1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT "UQ_3617f5ad52593fd4355b38d03a1" UNIQUE (code);


--
-- Name: password_recoveries UQ_475c17f5ca1417b7e13458bfd5e; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_recoveries
    ADD CONSTRAINT "UQ_475c17f5ca1417b7e13458bfd5e" UNIQUE (token);


--
-- Name: activity_ratings UQ_67113087bd405e4ae23c2d73d3d; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_ratings
    ADD CONSTRAINT "UQ_67113087bd405e4ae23c2d73d3d" UNIQUE ("userId", "libraryActivityId");


--
-- Name: institutions UQ_6792c8defe188502371562c180b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.institutions
    ADD CONSTRAINT "UQ_6792c8defe188502371562c180b" UNIQUE ("apiKey");


--
-- Name: classrooms UQ_960add459f910d8bc6acdc4347b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT "UQ_960add459f910d8bc6acdc4347b" UNIQUE ("inviteCode");


--
-- Name: users UQ_97672ac88f789774dd47f7c8be3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email);


--
-- Name: achievements UQ_e0eddafc2205804efdaa91e5583; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.achievements
    ADD CONSTRAINT "UQ_e0eddafc2205804efdaa91e5583" UNIQUE (identifier);


--
-- Name: game_ratings UQ_ede165b362d17214c1a2b16be4b; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_ratings
    ADD CONSTRAINT "UQ_ede165b362d17214c1a2b16be4b" UNIQUE ("gameId", "userId");


--
-- Name: user_profile_audits user_profile_audits_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profile_audits
    ADD CONSTRAINT user_profile_audits_pkey PRIMARY KEY (id);


--
-- Name: IDX_0057af7dff7e33be9024511e23; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_0057af7dff7e33be9024511e23" ON public.password_recoveries USING btree ("expiresAt", status);


--
-- Name: IDX_007fda8ea26bd89d01943b672f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_007fda8ea26bd89d01943b672f" ON public.user_purchases USING btree ("userId", "purchaseStatus");


--
-- Name: IDX_01f0437a6e8a87ff47834baa5d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_01f0437a6e8a87ff47834baa5d" ON public.store_items USING btree (rarity, price);


--
-- Name: IDX_03e7363211493647522bd514d6; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_03e7363211493647522bd514d6" ON public.user_purchases USING btree ("storeItemId");


--
-- Name: IDX_040aeac2d9bcc1e38874ce2201; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_040aeac2d9bcc1e38874ce2201" ON public.reports USING btree ("reporterId", "createdAt");


--
-- Name: IDX_063cb5118fb9492ebaca052797; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_063cb5118fb9492ebaca052797" ON public.contacts USING btree (type, "createdAt");


--
-- Name: IDX_0d2cf41e7f5e2ae29e24216e7f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_0d2cf41e7f5e2ae29e24216e7f" ON public.activity_ratings USING btree ("userId");


--
-- Name: IDX_110d23a3aaee97ac1517d08dff; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_110d23a3aaee97ac1517d08dff" ON public.store_items USING btree ("isActive", availability);


--
-- Name: IDX_1cc0e17b15e64cb50b8ae44bcf; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_1cc0e17b15e64cb50b8ae44bcf" ON public.institutions USING btree (domain);


--
-- Name: IDX_1de2da804dd3e21c9e14d56168; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_1de2da804dd3e21c9e14d56168" ON public.institutions USING btree ("subscriptionEndDate");


--
-- Name: IDX_1fa2dfd29603d95ae92071e53c; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_1fa2dfd29603d95ae92071e53c" ON public.password_recoveries USING btree (user_id, status, type);


--
-- Name: IDX_221a2dd9331e46ed66df60d5ca; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_221a2dd9331e46ed66df60d5ca" ON public.user_purchases USING btree ("userId", "storeItemId");


--
-- Name: IDX_251ca3037439c8796879b8c2f9; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_251ca3037439c8796879b8c2f9" ON public.activity_library USING btree (category, "difficultyLevel");


--
-- Name: IDX_323eec7e065189030a561c2ca9; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_323eec7e065189030a561c2ca9" ON public.activity_library USING btree ("isActive");


--
-- Name: IDX_3348ff889edc870552de0c7f52; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_3348ff889edc870552de0c7f52" ON public.activity_ratings USING btree ("isActive");


--
-- Name: IDX_3617f5ad52593fd4355b38d03a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_3617f5ad52593fd4355b38d03a" ON public.institutions USING btree (code);


--
-- Name: IDX_3ac6bc9da3e8a56f3f7082012d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_3ac6bc9da3e8a56f3f7082012d" ON public.user_achievements USING btree ("userId");


--
-- Name: IDX_4391818d0533a549153d33bfb2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_4391818d0533a549153d33bfb2" ON public.institutions USING btree ("subscriptionPlan");


--
-- Name: IDX_46e4a041f8f04ede1c016f3e71; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_46e4a041f8f04ede1c016f3e71" ON public.activity_tags USING btree ("libraryActivityId");


--
-- Name: IDX_475c17f5ca1417b7e13458bfd5; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_475c17f5ca1417b7e13458bfd5" ON public.password_recoveries USING btree (token);


--
-- Name: IDX_4f0ea1d60f6e459861cd51b8b9; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_4f0ea1d60f6e459861cd51b8b9" ON public.notifications USING btree (priority, created_at);


--
-- Name: IDX_5613597f3786a87ab8e8b403e4; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_5613597f3786a87ab8e8b403e4" ON public.activity_library USING btree ("authorId");


--
-- Name: IDX_564a21d71b296b3c18bb7f835f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_564a21d71b296b3c18bb7f835f" ON public.activity_ratings USING btree ("userId", "createdAt");


--
-- Name: IDX_59b6b82d03df988fd826025367; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_59b6b82d03df988fd826025367" ON public.user_purchases USING btree ("createdAt");


--
-- Name: IDX_5afd26349a5206f2a51250b3f6; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_5afd26349a5206f2a51250b3f6" ON public.activity_library USING btree (visibility, "isActive");


--
-- Name: IDX_5b5ac1a37a1c1b494085e28d31; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_5b5ac1a37a1c1b494085e28d31" ON public.contacts USING btree (status, "createdAt");


--
-- Name: IDX_61fac8cc9876a2eaf8fd4e52bd; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_61fac8cc9876a2eaf8fd4e52bd" ON public.store_items USING btree ("createdAt");


--
-- Name: IDX_640c2f337c2471e61d7ddd553d; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_640c2f337c2471e61d7ddd553d" ON public.user_profiles USING btree ("isPublic");


--
-- Name: IDX_6a5a5816f54d0044ba5f3dc2b7; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_6a5a5816f54d0044ba5f3dc2b7" ON public.user_achievements USING btree ("achievementId");


--
-- Name: IDX_6ca9503d77ae39b4b5a6cc3ba8; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "IDX_6ca9503d77ae39b4b5a6cc3ba8" ON public.user_profiles USING btree (user_id);


--
-- Name: IDX_781a2c0adee4125f1f6906a14a; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_781a2c0adee4125f1f6906a14a" ON public.reports USING btree (status, "createdAt");


--
-- Name: IDX_7c20dfb2ea882d21ec538cdf26; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_7c20dfb2ea882d21ec538cdf26" ON public.activity_library USING btree ("originalActivityId");


--
-- Name: IDX_7ca6f0171016bedc72dafb2752; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_7ca6f0171016bedc72dafb2752" ON public.user_purchases USING btree ("storeItemId", "purchaseStatus");


--
-- Name: IDX_7dd11c7db3072f87516bdca486; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_7dd11c7db3072f87516bdca486" ON public.notifications USING btree (type, created_at);


--
-- Name: IDX_832682a504f905ce41efed267b; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_832682a504f905ce41efed267b" ON public.reports USING btree ("reportedActivityId", status);


--
-- Name: IDX_8451e4c75ae10eb786f41d84f2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_8451e4c75ae10eb786f41d84f2" ON public.activity_library USING btree ("averageRating", "totalRatings");


--
-- Name: IDX_89b28b2d0561b98586e9208fb3; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_89b28b2d0561b98586e9208fb3" ON public.user_purchases USING btree ("userId");


--
-- Name: IDX_8b6de0e2657896d51214d8302e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_8b6de0e2657896d51214d8302e" ON public.classroom_students USING btree ("classroomId");


--
-- Name: IDX_9a79ede7a0868b19984509a956; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_9a79ede7a0868b19984509a956" ON public.classroom_students USING btree ("studentId");


--
-- Name: IDX_9b83e66fdfde03a9cb70654352; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_9b83e66fdfde03a9cb70654352" ON public.notifications USING btree (recipient_id, "isRead", created_at);


--
-- Name: IDX_9bf15c234266fd3c914a610c41; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_9bf15c234266fd3c914a610c41" ON public.institutions USING btree (status);


--
-- Name: IDX_b2baa2e83f880e49fdb0e5b594; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_b2baa2e83f880e49fdb0e5b594" ON public.activity_ratings USING btree ("libraryActivityId");


--
-- Name: IDX_b908fe202cb80921279db26399; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_b908fe202cb80921279db26399" ON public.activity_tags USING btree ("tagName", "isActive");


--
-- Name: IDX_ca61defe8e60d001fb2941c4ca; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_ca61defe8e60d001fb2941c4ca" ON public.activity_ratings USING btree ("libraryActivityId", rating);


--
-- Name: IDX_d3038c54ca1fc16e56b0e7ac4e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_d3038c54ca1fc16e56b0e7ac4e" ON public.activity_library USING btree ("authorId", "createdAt");


--
-- Name: IDX_d4986255d5ac57139706cc93a9; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_d4986255d5ac57139706cc93a9" ON public.institutions USING btree (status, "subscriptionPlan");


--
-- Name: IDX_d6306a1c950c28a36a2294c787; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_d6306a1c950c28a36a2294c787" ON public.user_profiles USING btree ("displayName");


--
-- Name: IDX_d8550ce57f9ccde0a1620457a5; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_d8550ce57f9ccde0a1620457a5" ON public.store_items USING btree (type, availability);


--
-- Name: IDX_d8ccaf868fb1b3ea576fcafb6f; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_d8ccaf868fb1b3ea576fcafb6f" ON public.store_items USING btree ("isActive");


--
-- Name: IDX_f60544889ed43834753feb2a7e; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "IDX_f60544889ed43834753feb2a7e" ON public.institutions USING btree ("createdAt", status);


--
-- Name: idx_user_profile_audits_operation; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profile_audits_operation ON public.user_profile_audits USING btree (operation);


--
-- Name: idx_user_profile_audits_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_user_profile_audits_user_id ON public.user_profile_audits USING btree (user_id);


--
-- Name: user_purchases FK_03e7363211493647522bd514d69; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_purchases
    ADD CONSTRAINT "FK_03e7363211493647522bd514d69" FOREIGN KEY ("storeItemId") REFERENCES public.store_items(id) ON DELETE RESTRICT;


--
-- Name: reports FK_0555156c25d91414304807100f9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT "FK_0555156c25d91414304807100f9" FOREIGN KEY ("moderatorId") REFERENCES public.users(id);


--
-- Name: crossword_puzzles FK_061edf3c95a985a8975a6f18be6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.crossword_puzzles
    ADD CONSTRAINT "FK_061edf3c95a985a8975a6f18be6" FOREIGN KEY ("gameId") REFERENCES public.games(id);


--
-- Name: activity_ratings FK_0d2cf41e7f5e2ae29e24216e7f8; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_ratings
    ADD CONSTRAINT "FK_0d2cf41e7f5e2ae29e24216e7f8" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: games FK_1f493134f8ca4ab276efa0ab784; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.games
    ADD CONSTRAINT "FK_1f493134f8ca4ab276efa0ab784" FOREIGN KEY ("createdById") REFERENCES public.users(id);


--
-- Name: user_achievements FK_3ac6bc9da3e8a56f3f7082012dd; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "FK_3ac6bc9da3e8a56f3f7082012dd" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_purchases FK_3e5d70ca0b950ff8123287ffa5f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_purchases
    ADD CONSTRAINT "FK_3e5d70ca0b950ff8123287ffa5f" FOREIGN KEY ("giftFromUserId") REFERENCES public.users(id);


--
-- Name: questions FK_410d69e359df7d12e549b167ddc; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.questions
    ADD CONSTRAINT "FK_410d69e359df7d12e549b167ddc" FOREIGN KEY ("gameId") REFERENCES public.games(id);


--
-- Name: notifications FK_4140c8b09ff58165daffbefbd7e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_4140c8b09ff58165daffbefbd7e" FOREIGN KEY (sender_id) REFERENCES public.users(id);


--
-- Name: reports FK_4353be8309ce86650def2f8572d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT "FK_4353be8309ce86650def2f8572d" FOREIGN KEY ("reporterId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: activity_tags FK_46e4a041f8f04ede1c016f3e71d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_tags
    ADD CONSTRAINT "FK_46e4a041f8f04ede1c016f3e71d" FOREIGN KEY ("libraryActivityId") REFERENCES public.activity_library(id) ON DELETE CASCADE;


--
-- Name: notifications FK_5332a4daa46fd3f4e6625dd275d; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT "FK_5332a4daa46fd3f4e6625dd275d" FOREIGN KEY (recipient_id) REFERENCES public.users(id);


--
-- Name: activity_library FK_5613597f3786a87ab8e8b403e4e; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_library
    ADD CONSTRAINT "FK_5613597f3786a87ab8e8b403e4e" FOREIGN KEY ("authorId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: activity_completions FK_56b0e7c7a73e54e65feba105e8f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_completions
    ADD CONSTRAINT "FK_56b0e7c7a73e54e65feba105e8f" FOREIGN KEY ("studentId") REFERENCES public.users(id);


--
-- Name: activities FK_579056df0c92b0f6432e96b2048; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT "FK_579056df0c92b0f6432e96b2048" FOREIGN KEY ("createdById") REFERENCES public.users(id);


--
-- Name: game_comments FK_698cb449bc5f7bd1b806b6948b6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_comments
    ADD CONSTRAINT "FK_698cb449bc5f7bd1b806b6948b6" FOREIGN KEY ("gameId") REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: user_achievements FK_6a5a5816f54d0044ba5f3dc2b74; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_achievements
    ADD CONSTRAINT "FK_6a5a5816f54d0044ba5f3dc2b74" FOREIGN KEY ("achievementId") REFERENCES public.achievements(id);


--
-- Name: game_comments FK_6c29cf9a8d72de67ec41d8df8e6; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_comments
    ADD CONSTRAINT "FK_6c29cf9a8d72de67ec41d8df8e6" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_profiles FK_6ca9503d77ae39b4b5a6cc3ba88; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT "FK_6ca9503d77ae39b4b5a6cc3ba88" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: game_results FK_6d7c521e6b5e4ed128101857979; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_results
    ADD CONSTRAINT "FK_6d7c521e6b5e4ed128101857979" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: activity_library FK_7c20dfb2ea882d21ec538cdf262; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_library
    ADD CONSTRAINT "FK_7c20dfb2ea882d21ec538cdf262" FOREIGN KEY ("originalActivityId") REFERENCES public.activities(id) ON DELETE CASCADE;


--
-- Name: simulations FK_80f9d5b89f48eb2eb15f03a0cb2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.simulations
    ADD CONSTRAINT "FK_80f9d5b89f48eb2eb15f03a0cb2" FOREIGN KEY ("gameId") REFERENCES public.games(id);


--
-- Name: user_purchases FK_89b28b2d0561b98586e9208fb3f; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_purchases
    ADD CONSTRAINT "FK_89b28b2d0561b98586e9208fb3f" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: classroom_students FK_8b6de0e2657896d51214d8302e2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_students
    ADD CONSTRAINT "FK_8b6de0e2657896d51214d8302e2" FOREIGN KEY ("classroomId") REFERENCES public.classrooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user_inventory FK_8b939d16efe58241bc0ce0c8d89; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_inventory
    ADD CONSTRAINT "FK_8b939d16efe58241bc0ce0c8d89" FOREIGN KEY ("userId") REFERENCES public.users(id);


--
-- Name: classroom_students FK_9a79ede7a0868b19984509a9561; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classroom_students
    ADD CONSTRAINT "FK_9a79ede7a0868b19984509a9561" FOREIGN KEY ("studentId") REFERENCES public.users(id);


--
-- Name: activity_ratings FK_b2baa2e83f880e49fdb0e5b5940; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_ratings
    ADD CONSTRAINT "FK_b2baa2e83f880e49fdb0e5b5940" FOREIGN KEY ("libraryActivityId") REFERENCES public.activity_library(id) ON DELETE CASCADE;


--
-- Name: reports FK_c15ba224c867dab4153c410c30c; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT "FK_c15ba224c867dab4153c410c30c" FOREIGN KEY ("reportedActivityId") REFERENCES public.activities(id) ON DELETE SET NULL;


--
-- Name: game_ratings FK_c2b5cfa59972505a6e12d9817e9; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_ratings
    ADD CONSTRAINT "FK_c2b5cfa59972505a6e12d9817e9" FOREIGN KEY ("gameId") REFERENCES public.games(id) ON DELETE CASCADE;


--
-- Name: game_ratings FK_c3c5c36cf19a7a8cb8895623be2; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_ratings
    ADD CONSTRAINT "FK_c3c5c36cf19a7a8cb8895623be2" FOREIGN KEY ("userId") REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: activity_completions FK_d7ee6340edfbdf5810d72d5128a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_completions
    ADD CONSTRAINT "FK_d7ee6340edfbdf5810d72d5128a" FOREIGN KEY ("activityId") REFERENCES public.activities(id);


--
-- Name: activities FK_ea0d9f97e848be531c6b0b217ce; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT "FK_ea0d9f97e848be531c6b0b217ce" FOREIGN KEY ("classroomId") REFERENCES public.classrooms(id);


--
-- Name: classrooms FK_ea22bf3c6b069755e01340f6334; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.classrooms
    ADD CONSTRAINT "FK_ea22bf3c6b069755e01340f6334" FOREIGN KEY ("teacherId") REFERENCES public.users(id);


--
-- Name: game_results FK_ec862f9e3228a3d2c39b5a3d65a; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.game_results
    ADD CONSTRAINT "FK_ec862f9e3228a3d2c39b5a3d65a" FOREIGN KEY ("gameId") REFERENCES public.games(id);


--
-- Name: password_recoveries FK_ee493797f4c3e9715d9b6fc8c82; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_recoveries
    ADD CONSTRAINT "FK_ee493797f4c3e9715d9b6fc8c82" FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_profile_audits fk_user_profile_audits_actor; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profile_audits
    ADD CONSTRAINT fk_user_profile_audits_actor FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: user_profile_audits fk_user_profile_audits_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_profile_audits
    ADD CONSTRAINT fk_user_profile_audits_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict X7htvhaJH8hZFV5OM7jx2GWJOxRKoirAFs3V5ztmT24VCBxudXctjwXnV7ub8rI

