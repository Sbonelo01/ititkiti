"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/utils/supabaseClient";
import { User } from "@supabase/supabase-js";
import { 
  CalendarIcon, 
  ArrowLeftIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  SparklesIcon,
  ClockIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';

interface EventFormData {
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  price: number;
  total_tickets: number;
}

export default function EditEvent() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [eventNotFound, setEventNotFound] = useState(false);
  const router = useRouter();
  const params = useParams();
  const eventId = params.id as string;

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    price: 0,
    total_tickets: 0,
  });

  const loadEventData = useCallback(async (userId: string) => {
    try {
      console.log('Loading event data for event ID:', eventId, 'and user ID:', userId);
      
      const { data: allEvents, error: allEventsError } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId);

      console.log('All events with this ID:', { allEvents, allEventsError });
      
      if (allEventsError || !allEvents || allEvents.length === 0) {
        console.error('Event not found in database');
        setEventNotFound(true);
        return;
      }

      const event = allEvents[0];
      console.log('Found event:', event);
      console.log('Event organizer_id:', event.organizer_id, 'User ID:', userId);

      if (event.organizer_id !== userId) {
        console.error('User does not own this event');
        setEventNotFound(true);
        return;
      }

      const eventDate = new Date(event.date);
      const dateString = eventDate.toISOString().split('T')[0];
      const timeString = eventDate.toTimeString().split(' ')[0].substring(0, 5);

      setFormData({
        title: event.title,
        description: event.description,
        date: dateString,
        time: timeString,
        location: event.location,
        price: event.price,
        total_tickets: event.total_tickets,
      });

    } catch (error) {
      console.error('Error:', error);
      setEventNotFound(true);
    }
  }, [eventId]);

  useEffect(() => {
    const checkAuthAndLoadEvent = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login');
        return;
      }

      const userRole = session.user.user_metadata?.role;
      if (userRole !== 'organizer') {
        router.push('/dashboard');
        return;
      }

      setUser(session.user);
      await loadEventData(session.user.id);
      setLoading(false);
    };

    checkAuthAndLoadEvent();
  }, [router, eventId, loadEventData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'total_tickets' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!formData.title || !formData.description || !formData.date || !formData.time || !formData.location) {
      setError("Please fill in all required fields");
      setSubmitting(false);
      return;
    }

    if (formData.price < 0 || formData.total_tickets <= 0) {
      setError("Please enter valid ticket price and quantity");
      setSubmitting(false);
      return;
    }

    try {
      const eventDateTime = new Date(`${formData.date}T${formData.time}`).toISOString();

      const eventData = {
        title: formData.title,
        description: formData.description,
        date: eventDateTime,
        location: formData.location,
        price: formData.price,
        total_tickets: formData.total_tickets,
      };

      console.log('Updating event with data:', eventData);
      console.log('Event ID:', eventId, 'User ID:', user?.id);

      const { data, error } = await supabase
        .from('events')
        .update(eventData)
        .eq('id', eventId)
        .eq('organizer_id', user?.id)
        .select();

      console.log('Update result:', { data, error });

      if (error) {
        console.error('Supabase update error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        console.error('No rows were updated');
        throw new Error('No rows were updated. Check if you have permission to edit this event.');
      }

      console.log('Event updated successfully!', data);
      setSuccess(true);
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err: unknown) {
      console.error('Error updating event:', err);
      setError(err instanceof Error ? err.message : 'Failed to update event');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-green-200 border-t-green-500 mx-auto mb-4"></div>
          <p className="text-lg text-gray-600 font-medium">Loading event...</p>
        </div>
      </div>
    );
  }

  if (eventNotFound) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
            <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Event Not Found</h2>
            <p className="text-gray-600 mb-6">
              The event you&apos;re looking for doesn&apos;t exist or you don&apos;t have permission to edit it.
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="bg-green-500 text-white px-6 py-3 rounded-xl hover:bg-green-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md mx-auto">
            <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircleIcon className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Event Updated Successfully!</h2>
            <p className="text-gray-600 mb-6">Your event has been updated and is now live.</p>
            <div className="animate-pulse">
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-white">
      {/* Header Section */}
      <section className="relative bg-gradient-to-br from-green-600 via-green-700 to-green-800 py-12 overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full animate-bounce"></div>
          <div className="absolute top-20 right-20 w-24 h-24 bg-green-200 rounded-full animate-pulse"></div>
          <div className="absolute bottom-10 left-1/4 w-20 h-20 bg-emerald-200 rounded-full animate-spin"></div>
          <div className="absolute bottom-20 right-1/3 w-28 h-28 bg-teal-200 rounded-full animate-bounce"></div>
        </div>
        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-xl hover:bg-white/30 transition-all duration-200 font-semibold flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <ArrowLeftIcon className="h-5 w-5" />
                Back to Dashboard
              </button>
            </div>
            <div className="flex items-center gap-3">
              <SparklesIcon className="h-8 w-8 text-yellow-300" />
              <span className="bg-white/20 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-semibold">
                Edit Event
              </span>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4 leading-tight">
              Update Your
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-300">
                Event Details
              </span>
            </h1>
            <p className="text-xl text-white/90 max-w-2xl mx-auto">
              Make changes to your event and keep your attendees informed with the latest updates.
            </p>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            {/* Form Header */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 px-8 py-6">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 backdrop-blur-sm w-12 h-12 rounded-xl flex items-center justify-center">
                  <PencilIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Event Information</h2>
                  <p className="text-white/90 text-sm">Update your event details below</p>
                </div>
              </div>
            </div>

            {/* Form Content */}
            <div className="p-8">
              <form onSubmit={handleSubmit} className="space-y-8">
                {/* Event Title */}
                <div className="space-y-3">
                  <label htmlFor="title" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <DocumentTextIcon className="h-5 w-5 text-green-500" />
                    Event Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200"
                    placeholder="Enter your event title"
                    required
                  />
                </div>

                {/* Description */}
                <div className="space-y-3">
                  <label htmlFor="description" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                    <DocumentTextIcon className="h-5 w-5 text-green-500" />
                    Event Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200 resize-none"
                    placeholder="Describe your event in detail..."
                    required
                  />
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label htmlFor="date" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                      <CalendarIcon className="h-5 w-5 text-green-500" />
                      Event Date *
                    </label>
                    <input
                      type="date"
                      id="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label htmlFor="time" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                      <ClockIcon className="h-5 w-5 text-green-500" />
                      Event Time *
                    </label>
                    <input
                      type="time"
                      id="time"
                      name="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200"
                      required
                    />
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-3">
                                     <label htmlFor="location" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                     <MapPinIcon className="h-5 w-5 text-green-500" />
                     Venue/Location *
                   </label>
                  <input
                    type="text"
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200"
                    placeholder="Enter venue or location"
                    required
                  />
                </div>

                {/* Ticket Price and Quantity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label htmlFor="price" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                      <CurrencyDollarIcon className="h-5 w-5 text-green-500" />
                      Ticket Price (R) *
                    </label>
                    <input
                      type="number"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      min="0"
                      step="0.01"
                      className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-3">
                    <label htmlFor="total_tickets" className="flex items-center gap-2 text-lg font-semibold text-gray-800">
                      <UserGroupIcon className="h-5 w-5 text-green-500" />
                      Total Tickets *
                    </label>
                    <input
                      type="number"
                      id="total_tickets"
                      name="total_tickets"
                      value={formData.total_tickets}
                      onChange={handleInputChange}
                      min="1"
                      className="w-full px-4 py-4 bg-gray-50 text-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:shadow-lg border border-gray-200 hover:border-green-300 transition-all duration-200"
                      placeholder="100"
                      required
                    />
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
                      <p className="text-red-700 font-medium">{error}</p>
                    </div>
                  </div>
                )}

                {/* Submit Buttons */}
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => router.push('/dashboard')}
                    className="flex-1 bg-gray-100 text-gray-700 px-8 py-4 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    <XCircleIcon className="h-5 w-5" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-green-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        Updating Event...
                      </>
                    ) : (
                      <>
                        <CheckCircleIcon className="h-5 w-5" />
                        Update Event
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}