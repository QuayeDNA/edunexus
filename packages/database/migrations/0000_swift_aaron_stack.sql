CREATE TABLE "academic_years" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"content" text NOT NULL,
	"audience" varchar(50) NOT NULL,
	"priority" varchar(20) DEFAULT 'normal' NOT NULL,
	"published_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applicants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"date_of_birth" date NOT NULL,
	"gender" varchar(10) NOT NULL,
	"guardian_name" varchar(200) NOT NULL,
	"guardian_email" varchar(255) NOT NULL,
	"guardian_phone" varchar(20),
	"guardian_address" text,
	"grade_level_id" uuid NOT NULL,
	"previous_school" varchar(255),
	"document_urls" text[],
	"status" varchar(20) DEFAULT 'submitted' NOT NULL,
	"admin_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_scores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"assessment_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"score" numeric(6, 2) NOT NULL,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessment_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"weight" numeric(5, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"assessment_type_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"max_score" numeric(6, 2) NOT NULL,
	"date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" varchar(20) NOT NULL,
	"check_in" timestamp with time zone,
	"check_out" timestamp with time zone,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"action" varchar(50) NOT NULL,
	"table_name" varchar(100) NOT NULL,
	"record_id" uuid,
	"old_data" jsonb,
	"new_data" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "behavior_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"recorded_by" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" text NOT NULL,
	"date" date NOT NULL,
	"action" varchar(100),
	"resolved" boolean DEFAULT false NOT NULL,
	"resolved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"book_id" uuid NOT NULL,
	"student_id" uuid,
	"staff_id" uuid,
	"loan_date" date NOT NULL,
	"due_date" date NOT NULL,
	"return_date" date,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"isbn" varchar(20),
	"title" varchar(255) NOT NULL,
	"author" varchar(255) NOT NULL,
	"publisher" varchar(255),
	"year_published" integer,
	"category" varchar(100),
	"shelf_location" varchar(50),
	"total_copies" integer DEFAULT 1 NOT NULL,
	"available_copies" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "class_subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"teacher_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"code" varchar(20),
	"grade_level_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"homeroom_teacher_id" uuid,
	"capacity" integer,
	"room_number" varchar(20),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "expenses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"expense_date" date NOT NULL,
	"payment_method" varchar(50),
	"receipt_reference" varchar(100),
	"approved_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"is_optional" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fee_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"term_id" uuid,
	"fee_category_id" uuid NOT NULL,
	"class_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "grade_levels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"level" integer NOT NULL,
	"category" varchar(50) NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"relationship" varchar(50) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"address" text,
	"occupation" varchar(100),
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100) NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit_price" numeric(12, 2),
	"reorder_level" integer DEFAULT 0 NOT NULL,
	"location" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"quantity" integer NOT NULL,
	"reference" varchar(100),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"subscription_id" uuid,
	"invoice_number" varchar(50) NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"due_date" timestamp with time zone NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invoices_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE "lesson_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"teacher_id" uuid,
	"title" varchar(255) NOT NULL,
	"objectives" text,
	"materials" text,
	"activities" text,
	"assessment" text,
	"week" integer,
	"term_id" uuid,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"subject" varchar(255),
	"body" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"parent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "parent_engagements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"notes" text,
	"engagement_date" date NOT NULL,
	"follow_up" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"student_fee_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"method" varchar(50) NOT NULL,
	"reference" varchar(100),
	"transaction_id" varchar(100),
	"momo_provider" varchar(20),
	"payment_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"receipt_number" varchar(50),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payroll_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"month" varchar(7) NOT NULL,
	"year" varchar(4) NOT NULL,
	"total_gross" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_deductions" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_net" numeric(14, 2) DEFAULT '0' NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"processed_at" timestamp with time zone,
	"processed_by" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payslips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"payroll_run_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"basic_salary" numeric(12, 2) NOT NULL,
	"allowances" numeric(12, 2) DEFAULT '0' NOT NULL,
	"deductions" numeric(12, 2) DEFAULT '0' NOT NULL,
	"ssnit_employee" numeric(12, 2) DEFAULT '0' NOT NULL,
	"ssnit_employer" numeric(12, 2) DEFAULT '0' NOT NULL,
	"paye_tax" numeric(12, 2) DEFAULT '0' NOT NULL,
	"gross_pay" numeric(12, 2) NOT NULL,
	"net_pay" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid,
	"email" varchar(255) NOT NULL,
	"password_hash" text,
	"role" varchar(20) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"phone" varchar(20),
	"avatar" text,
	"auth_user_id" varchar(255),
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"term_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"total_score" numeric(8, 2),
	"average" numeric(5, 2),
	"position" integer,
	"class_average" numeric(5, 2),
	"teacher_remarks" text,
	"head_remarks" text,
	"next_term_start" date,
	"is_published" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"vehicle_id" uuid,
	"driver_id" uuid,
	"morning_pickup" time,
	"evening_dropoff" time,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "school_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"description" varchar(500),
	"features" jsonb DEFAULT '[]'::jsonb,
	"price" numeric(12, 2) NOT NULL,
	"billing_cycle" varchar(20) DEFAULT 'monthly' NOT NULL,
	"max_students" integer DEFAULT 0 NOT NULL,
	"max_staff" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "school_plans_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "school_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"next_billing_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "schools" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"code" varchar(20) NOT NULL,
	"address" text,
	"phone" varchar(20),
	"email" varchar(255),
	"website" varchar(255),
	"logo" text,
	"region" varchar(100),
	"curriculum" varchar(50) DEFAULT 'ghana_basic' NOT NULL,
	"calendar" varchar(50) DEFAULT 'ghana_3_terms' NOT NULL,
	"grading" varchar(50) DEFAULT 'ghana_basic' NOT NULL,
	"domain" varchar(255),
	"custom_domain" varchar(255),
	"config" jsonb DEFAULT '{}'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "schools_slug_unique" UNIQUE("slug"),
	CONSTRAINT "schools_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"staff_id_number" varchar(50) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"other_names" varchar(100),
	"gender" varchar(10) NOT NULL,
	"date_of_birth" date NOT NULL,
	"nationality" varchar(100) DEFAULT 'Ghanaian',
	"religion" varchar(50),
	"address" text,
	"phone" varchar(20) NOT NULL,
	"email" varchar(255),
	"role" varchar(50) NOT NULL,
	"department" varchar(100),
	"employment_status" varchar(20) DEFAULT 'permanent' NOT NULL,
	"date_hired" date NOT NULL,
	"qualification" varchar(100),
	"ssnit_number" varchar(50),
	"bank_name" varchar(100),
	"bank_account" varchar(50),
	"emergency_contact" varchar(20),
	"emergency_name" varchar(100),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "staff_attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"date" date NOT NULL,
	"status" varchar(20) NOT NULL,
	"check_in" timestamp with time zone,
	"check_out" timestamp with time zone,
	"remarks" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_fees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"fee_schedule_id" uuid NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"paid" numeric(12, 2) DEFAULT '0' NOT NULL,
	"balance" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"due_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_guardians" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"student_id" uuid NOT NULL,
	"guardian_id" uuid NOT NULL,
	"relationship" varchar(50) NOT NULL,
	"is_emergency" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "student_transport" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"pickup_point" text,
	"dropoff_point" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id_number" varchar(50) NOT NULL,
	"first_name" varchar(100) NOT NULL,
	"last_name" varchar(100) NOT NULL,
	"other_names" varchar(100),
	"gender" varchar(10) NOT NULL,
	"date_of_birth" date NOT NULL,
	"place_of_birth" varchar(100),
	"nationality" varchar(100) DEFAULT 'Ghanaian',
	"religion" varchar(50),
	"address" text,
	"phone" varchar(20),
	"email" varchar(255),
	"blood_group" varchar(10),
	"medical_notes" text,
	"enrollment_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"code" varchar(20) NOT NULL,
	"name" varchar(100) NOT NULL,
	"category" varchar(50),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"academic_year_id" uuid NOT NULL,
	"term_number" varchar(10) NOT NULL,
	"name" varchar(100) NOT NULL,
	"start_date" timestamp with time zone NOT NULL,
	"end_date" timestamp with time zone NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timetable_slots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"class_id" uuid NOT NULL,
	"subject_id" uuid NOT NULL,
	"teacher_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"room_number" varchar(20),
	"term_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"registration_number" varchar(20) NOT NULL,
	"model" varchar(100),
	"capacity" integer NOT NULL,
	"driver_name" varchar(100),
	"driver_phone" varchar(20),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wellness_checkins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"school_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"mood" integer NOT NULL,
	"energy" integer,
	"sleep" integer,
	"notes" text,
	"checkin_date" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "academic_years" ADD CONSTRAINT "academic_years_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applicants" ADD CONSTRAINT "applicants_grade_level_id_grade_levels_id_fk" FOREIGN KEY ("grade_level_id") REFERENCES "public"."grade_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_scores" ADD CONSTRAINT "assessment_scores_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_scores" ADD CONSTRAINT "assessment_scores_assessment_id_assessments_id_fk" FOREIGN KEY ("assessment_id") REFERENCES "public"."assessments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_scores" ADD CONSTRAINT "assessment_scores_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessment_types" ADD CONSTRAINT "assessment_types_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_assessment_type_id_assessment_types_id_fk" FOREIGN KEY ("assessment_type_id") REFERENCES "public"."assessment_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_records" ADD CONSTRAINT "behavior_records_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_records" ADD CONSTRAINT "behavior_records_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "behavior_records" ADD CONSTRAINT "behavior_records_recorded_by_profiles_id_fk" FOREIGN KEY ("recorded_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_loans" ADD CONSTRAINT "book_loans_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_subjects" ADD CONSTRAINT "class_subjects_teacher_id_staff_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_grade_level_id_grade_levels_id_fk" FOREIGN KEY ("grade_level_id") REFERENCES "public"."grade_levels"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "classes" ADD CONSTRAINT "classes_homeroom_teacher_id_staff_id_fk" FOREIGN KEY ("homeroom_teacher_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_categories" ADD CONSTRAINT "fee_categories_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_fee_category_id_fee_categories_id_fk" FOREIGN KEY ("fee_category_id") REFERENCES "public"."fee_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fee_schedules" ADD CONSTRAINT "fee_schedules_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "grade_levels" ADD CONSTRAINT "grade_levels_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardians" ADD CONSTRAINT "guardians_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_item_id_inventory_items_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscription_id_school_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."school_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_plans" ADD CONSTRAINT "lesson_plans_teacher_id_staff_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_profiles_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_recipient_id_profiles_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_engagements" ADD CONSTRAINT "parent_engagements_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parent_engagements" ADD CONSTRAINT "parent_engagements_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_student_fee_id_student_fees_id_fk" FOREIGN KEY ("student_fee_id") REFERENCES "public"."student_fees"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payroll_runs" ADD CONSTRAINT "payroll_runs_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_payroll_run_id_payroll_runs_id_fk" FOREIGN KEY ("payroll_run_id") REFERENCES "public"."payroll_runs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payslips" ADD CONSTRAINT "payslips_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_term_id_terms_id_fk" FOREIGN KEY ("term_id") REFERENCES "public"."terms"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_cards" ADD CONSTRAINT "report_cards_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routes" ADD CONSTRAINT "routes_driver_id_staff_id_fk" FOREIGN KEY ("driver_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_subscriptions" ADD CONSTRAINT "school_subscriptions_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "school_subscriptions" ADD CONSTRAINT "school_subscriptions_plan_id_school_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."school_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_fees" ADD CONSTRAINT "student_fees_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_fees" ADD CONSTRAINT "student_fees_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_fees" ADD CONSTRAINT "student_fees_fee_schedule_id_fee_schedules_id_fk" FOREIGN KEY ("fee_schedule_id") REFERENCES "public"."fee_schedules"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_guardians" ADD CONSTRAINT "student_guardians_guardian_id_guardians_id_fk" FOREIGN KEY ("guardian_id") REFERENCES "public"."guardians"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_transport" ADD CONSTRAINT "student_transport_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_transport" ADD CONSTRAINT "student_transport_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_transport" ADD CONSTRAINT "student_transport_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "students" ADD CONSTRAINT "students_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terms" ADD CONSTRAINT "terms_academic_year_id_academic_years_id_fk" FOREIGN KEY ("academic_year_id") REFERENCES "public"."academic_years"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_class_id_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timetable_slots" ADD CONSTRAINT "timetable_slots_teacher_id_staff_id_fk" FOREIGN KEY ("teacher_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellness_checkins" ADD CONSTRAINT "wellness_checkins_school_id_schools_id_fk" FOREIGN KEY ("school_id") REFERENCES "public"."schools"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellness_checkins" ADD CONSTRAINT "wellness_checkins_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "public"."students"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_academic_years_school_id" ON "academic_years" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_academic_years_school_name" ON "academic_years" USING btree ("school_id","name");--> statement-breakpoint
CREATE INDEX "idx_announcements_school_id" ON "announcements" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_announcements_audience" ON "announcements" USING btree ("audience");--> statement-breakpoint
CREATE INDEX "idx_applicants_school_id" ON "applicants" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_applicants_status" ON "applicants" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_applicants_school_status" ON "applicants" USING btree ("school_id","status");--> statement-breakpoint
CREATE INDEX "idx_assessment_scores_school_id" ON "assessment_scores" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_scores_assessment_id" ON "assessment_scores" USING btree ("assessment_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_scores_student_id" ON "assessment_scores" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_assessment_scores_unique" ON "assessment_scores" USING btree ("assessment_id","student_id");--> statement-breakpoint
CREATE INDEX "idx_assessment_types_school_id" ON "assessment_types" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_assessments_school_id" ON "assessments" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_assessments_class_id" ON "assessments" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_assessments_subject_id" ON "assessments" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_school_id" ON "attendance" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_student_id" ON "attendance" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_attendance_date" ON "attendance" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_attendance_student_date" ON "attendance" USING btree ("student_id","date");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_school_id" ON "audit_logs" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_action" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_table_name" ON "audit_logs" USING btree ("table_name");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_behavior_records_school_id" ON "behavior_records" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_behavior_records_student_id" ON "behavior_records" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_behavior_records_type" ON "behavior_records" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_book_loans_school_id" ON "book_loans" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_book_loans_book_id" ON "book_loans" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "idx_book_loans_borrower" ON "book_loans" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_book_loans_status" ON "book_loans" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_books_school_id" ON "books" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_books_category" ON "books" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_class_subjects_school_id" ON "class_subjects" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_class_subjects_class_id" ON "class_subjects" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_class_subjects_subject_id" ON "class_subjects" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "idx_class_subjects_teacher_id" ON "class_subjects" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_classes_school_id" ON "classes" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_classes_grade_level_id" ON "classes" USING btree ("grade_level_id");--> statement-breakpoint
CREATE INDEX "idx_classes_academic_year_id" ON "classes" USING btree ("academic_year_id");--> statement-breakpoint
CREATE INDEX "idx_classes_teacher_id" ON "classes" USING btree ("homeroom_teacher_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_school_id" ON "expenses" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_expenses_category" ON "expenses" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_fee_categories_school_id" ON "fee_categories" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_fee_schedules_school_id" ON "fee_schedules" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_fee_schedules_category_id" ON "fee_schedules" USING btree ("fee_category_id");--> statement-breakpoint
CREATE INDEX "idx_grade_levels_school_id" ON "grade_levels" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_grade_levels_sort_order" ON "grade_levels" USING btree ("school_id","sort_order");--> statement-breakpoint
CREATE INDEX "idx_guardians_school_id" ON "guardians" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_items_school_id" ON "inventory_items" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_items_category" ON "inventory_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "idx_inventory_transactions_school_id" ON "inventory_transactions" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_transactions_item_id" ON "inventory_transactions" USING btree ("item_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_transactions_type" ON "inventory_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_invoices_school" ON "invoices" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_status" ON "invoices" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_lesson_plans_school_id" ON "lesson_plans" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_lesson_plans_class_id" ON "lesson_plans" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_lesson_plans_subject_id" ON "lesson_plans" USING btree ("subject_id");--> statement-breakpoint
CREATE INDEX "idx_messages_school_id" ON "messages" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_messages_sender_id" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_messages_recipient_id" ON "messages" USING btree ("recipient_id");--> statement-breakpoint
CREATE INDEX "idx_messages_is_read" ON "messages" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_notifications_school_id" ON "notifications" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_profile_id" ON "notifications" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_is_read" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_parent_engagements_school_id" ON "parent_engagements" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_parent_engagements_student_id" ON "parent_engagements" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_payments_school_id" ON "payments" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_payments_student_id" ON "payments" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_payments_reference" ON "payments" USING btree ("reference");--> statement-breakpoint
CREATE INDEX "idx_payroll_runs_school_id" ON "payroll_runs" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_payroll_runs_month_year" ON "payroll_runs" USING btree ("school_id","month","year");--> statement-breakpoint
CREATE INDEX "idx_payslips_school_id" ON "payslips" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_payslips_payroll_run_id" ON "payslips" USING btree ("payroll_run_id");--> statement-breakpoint
CREATE INDEX "idx_payslips_staff_id" ON "payslips" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_profiles_school_id" ON "profiles" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_profiles_school_email" ON "profiles" USING btree ("school_id","email");--> statement-breakpoint
CREATE INDEX "idx_profiles_role" ON "profiles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "idx_report_cards_school_id" ON "report_cards" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_report_cards_student_id" ON "report_cards" USING btree ("student_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_report_cards_unique" ON "report_cards" USING btree ("student_id","academic_year_id","term_id");--> statement-breakpoint
CREATE INDEX "idx_routes_school_id" ON "routes" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_school_subscriptions_school" ON "school_subscriptions" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_school_subscriptions_plan" ON "school_subscriptions" USING btree ("plan_id");--> statement-breakpoint
CREATE INDEX "idx_school_subscriptions_status" ON "school_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_staff_school_id" ON "staff" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_staff_school_id_number" ON "staff" USING btree ("school_id","staff_id_number");--> statement-breakpoint
CREATE INDEX "idx_staff_status" ON "staff" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_staff_attendance_school_id" ON "staff_attendance" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_staff_attendance_staff_id" ON "staff_attendance" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "idx_staff_attendance_date" ON "staff_attendance" USING btree ("date");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_staff_attendance_unique" ON "staff_attendance" USING btree ("staff_id","date");--> statement-breakpoint
CREATE INDEX "idx_student_fees_school_id" ON "student_fees" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_student_fees_student_id" ON "student_fees" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_student_fees_status" ON "student_fees" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_student_guardians_student_id" ON "student_guardians" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_student_guardians_guardian_id" ON "student_guardians" USING btree ("guardian_id");--> statement-breakpoint
CREATE INDEX "idx_student_transport_school_id" ON "student_transport" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_student_transport_student_id" ON "student_transport" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_student_transport_route_id" ON "student_transport" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX "idx_students_school_id" ON "students" USING btree ("school_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_students_school_id_number" ON "students" USING btree ("school_id","student_id_number");--> statement-breakpoint
CREATE INDEX "idx_students_status" ON "students" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_subjects_school_id" ON "subjects" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_subjects_code" ON "subjects" USING btree ("school_id","code");--> statement-breakpoint
CREATE INDEX "idx_terms_school_id" ON "terms" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_terms_academic_year_id" ON "terms" USING btree ("academic_year_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_terms_school_year_number" ON "terms" USING btree ("school_id","academic_year_id","term_number");--> statement-breakpoint
CREATE INDEX "idx_timetable_school_id" ON "timetable_slots" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_timetable_class_id" ON "timetable_slots" USING btree ("class_id");--> statement-breakpoint
CREATE INDEX "idx_timetable_teacher_id" ON "timetable_slots" USING btree ("teacher_id");--> statement-breakpoint
CREATE INDEX "idx_timetable_day_class" ON "timetable_slots" USING btree ("day_of_week","class_id");--> statement-breakpoint
CREATE INDEX "idx_vehicles_school_id" ON "vehicles" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_wellness_checkins_school_id" ON "wellness_checkins" USING btree ("school_id");--> statement-breakpoint
CREATE INDEX "idx_wellness_checkins_student_id" ON "wellness_checkins" USING btree ("student_id");--> statement-breakpoint
CREATE INDEX "idx_wellness_checkins_date" ON "wellness_checkins" USING btree ("checkin_date");