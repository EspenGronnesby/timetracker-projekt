-- Fix security definer view by setting security_invoker = true
ALTER VIEW public.customer_projects_view SET (security_invoker = true);