// ==========================================================================
// DETALLE DE AULA (CU-015 / CU-018)
// ==========================================================================
// Muestra información completa de un aula y habilita acciones administrativas
// como editar sus datos o crear nuevas actividades.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import {
  Activity,
  Classroom,
  ClassroomInvitation,
  InvitationDispatchResult,
  InvitationStatus,
} from '../../types';
import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  ClipboardCopy,
  Copy,
  MailPlus,
  Send,
  Loader2,
  Edit,
  RefreshCcw,
  RotateCcw,
  Ban,
  User,
  Users
} from 'lucide-react';
import { ClassroomService } from '../../services/implementations/ClassroomService';
import { ClassroomInvitationService } from '../../services/implementations/ClassroomInvitationService';
import { useAuth } from '../../contexts/useAuth';

const INVITATION_STATUS_STYLES: Record<InvitationStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  accepted: 'bg-emerald-100 text-emerald-700',
  revoked: 'bg-gray-200 text-gray-600',
  expired: 'bg-red-100 text-red-700',
};

interface ClassroomDetailProps {
  classroomId: string;
  onBack: () => void;
  onEdit?: (classroomId: string) => void;
  onCreateActivity?: (classroomId: string) => void;
}

interface InviteState {
  isLoading: boolean;
  error: string | null;
}

interface InvitationFormState {
  emails: string;
  message: string;
  isSubmitting: boolean;
  error: string | null;
  feedback: InvitationDispatchResult | null;
}

export const ClassroomDetail: React.FC<ClassroomDetailProps> = ({
  classroomId,
  onBack,
  onEdit,
  onCreateActivity
}) => {
  const { user } = useAuth();
  const classroomService = useMemo(() => ClassroomService.getInstance(), []);
  const invitationService = useMemo(() => ClassroomInvitationService.getInstance(), []);

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteState, setInviteState] = useState<InviteState>({ isLoading: false, error: null });
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [invitations, setInvitations] = useState<ClassroomInvitation[]>([]);
  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [invitationForm, setInvitationForm] = useState<InvitationFormState>({
    emails: '',
    message: '',
    isSubmitting: false,
    error: null,
    feedback: null,
  });
  const [invitationListError, setInvitationListError] = useState<string | null>(null);
  const [invitationActionFeedback, setInvitationActionFeedback] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState<Record<string, boolean>>({});
  const [revokeLoading, setRevokeLoading] = useState<Record<string, boolean>>({});

  const isTeacherOwner = user?.role === 'teacher' && classroom?.teacherId === user.id;

  const loadInvitations = useCallback(async () => {
    if (!classroom || !isTeacherOwner) {
      return;
    }

    try {
      setIsLoadingInvitations(true);
      setInvitationListError(null);
      const response = await invitationService.listInvitations(classroom.id);
      setInvitations(response);
    } catch (loadError) {
      console.error('[ClassroomDetail] Error cargando invitaciones:', loadError);
      const message = loadError instanceof Error ? loadError.message : 'No pudimos cargar las invitaciones del aula.';
      setInvitationListError(message);
    } finally {
      setIsLoadingInvitations(false);
    }
  }, [classroom, invitationService, isTeacherOwner]);

  useEffect(() => {
    const loadClassroom = async () => {
      try {
        setIsLoading(true);
        const response = await classroomService.getClassroomById(classroomId);

        if (!response) {
          throw new Error('No encontramos el aula solicitada');
        }

        setClassroom(response);
      } catch (loadError) {
        console.error('[ClassroomDetail] Error cargando aula:', loadError);
        const message = loadError instanceof Error ? loadError.message : 'Error al cargar el aula.';
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };

    void loadClassroom();
  }, [classroomId, classroomService]);

  useEffect(() => {
    if (!classroom || !isTeacherOwner) {
      return;
    }

    void loadInvitations();
  }, [classroom, isTeacherOwner, loadInvitations]);

  const handleInvitationFieldChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = event.target;
      setInvitationForm((prev) => ({
        ...prev,
        [name]: value,
        error: null,
        feedback: null,
      }));
    },
    [],
  );

  const handleSendInvitations = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!classroom) {
        return;
      }

      const parsedEmails = invitationForm.emails
        .split(/[\s,;\n\r]+/)
        .map((email) => email.trim().toLowerCase())
        .filter((email) => email.length > 0);

      if (parsedEmails.length === 0) {
        setInvitationForm((prev) => ({
          ...prev,
          error: 'Ingresa al menos un correo electrónico válido para enviar la invitación.',
        }));
        return;
      }

      setInvitationForm((prev) => ({
        ...prev,
        isSubmitting: true,
        error: null,
        feedback: null,
      }));

      try {
        const result = await invitationService.sendInvitations(classroom.id, parsedEmails, {
          message: invitationForm.message.trim() ? invitationForm.message.trim() : undefined,
        });

        setInvitationForm((prev) => ({
          emails: '',
          message: prev.message,
          isSubmitting: false,
          error: null,
          feedback: result,
        }));

        void loadInvitations();
      } catch (sendError) {
        console.error('[ClassroomDetail] Error enviando invitaciones:', sendError);
        const message = sendError instanceof Error ? sendError.message : 'Ocurrió un problema al enviar las invitaciones.';
        setInvitationForm((prev) => ({
          ...prev,
          isSubmitting: false,
          error: message,
        }));
      }
    },
    [classroom, invitationForm.emails, invitationForm.message, invitationService, loadInvitations],
  );

  const formatDate = useCallback((value?: string | Date | null) => {
    if (!value) {
      return '—';
    }
    try {
      return new Date(value).toLocaleString('es-ES', {
        day: '2-digit',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '—';
    }
  }, []);

  const handleResendInvitation = useCallback(
    async (invitationId: string) => {
      if (!classroom) {
        return;
      }

      setInvitationListError(null);
      setInvitationActionFeedback(null);
      setResendLoading((prev) => ({ ...prev, [invitationId]: true }));

      try {
        const targetInvitation = invitations.find((item) => item.id === invitationId);
        await invitationService.resendInvitation(classroom.id, invitationId, {
          message: targetInvitation?.message ?? undefined,
        });
        setInvitationActionFeedback('Invitación reenviada correctamente.');
        setTimeout(() => setInvitationActionFeedback(null), 4000);
        await loadInvitations();
      } catch (resendError) {
        console.error('[ClassroomDetail] Error reenviando invitación:', resendError);
        const message = resendError instanceof Error ? resendError.message : 'No pudimos reenviar la invitación seleccionada.';
        setInvitationListError(message);
      } finally {
        setResendLoading((prev) => ({ ...prev, [invitationId]: false }));
      }
    },
    [classroom, invitationService, invitations, loadInvitations],
  );

  const handleRevokeInvitation = useCallback(
    async (invitationId: string) => {
      if (!classroom) {
        return;
      }

      setInvitationListError(null);
      setInvitationActionFeedback(null);
      setRevokeLoading((prev) => ({ ...prev, [invitationId]: true }));

      try {
        await invitationService.revokeInvitation(classroom.id, invitationId);
        setInvitationActionFeedback('Invitación revocada correctamente.');
        setTimeout(() => setInvitationActionFeedback(null), 4000);
        await loadInvitations();
      } catch (revokeError) {
        console.error('[ClassroomDetail] Error revocando invitación:', revokeError);
        const message = revokeError instanceof Error ? revokeError.message : 'No pudimos revocar la invitación seleccionada.';
        setInvitationListError(message);
      } finally {
        setRevokeLoading((prev) => ({ ...prev, [invitationId]: false }));
      }
    },
    [classroom, invitationService, loadInvitations],
  );

  const processedInvitations = invitationForm.feedback?.processed.length ?? 0;
  const deliveredInvitations = invitationForm.feedback
    ? invitationForm.feedback.processed.filter((item) => item.status === 'sent').length
    : 0;
  const skippedInvitations = invitationForm.feedback
    ? invitationForm.feedback.processed.filter((item) => item.status !== 'sent').length
    : 0;

  const handleCopyInviteCode = async () => {
    if (!classroom?.inviteCode) {
      return;
    }

    try {
      await navigator.clipboard.writeText(classroom.inviteCode);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch (copyError) {
      console.error('[ClassroomDetail] Error copiando código:', copyError);
    }
  };

  const handleRegenerateInvite = async () => {
    if (!classroom) {
      return;
    }

    try {
      setInviteState({ isLoading: true, error: null });
      const newCode = await classroomService.generateNewInviteCode(classroom.id);
      setClassroom((prev) => (prev ? { ...prev, inviteCode: newCode } : prev));
    } catch (regenError) {
      console.error('[ClassroomDetail] Error regenerando código:', regenError);
      const message = regenError instanceof Error ? regenError.message : 'No pudimos regenerar el código.';
      setInviteState({ isLoading: false, error: message });
      return;
    }

    setInviteState({ isLoading: false, error: null });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando detalles del aula...</p>
        </div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border border-red-100 p-8 text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No pudimos mostrar el aula</h2>
          <p className="text-gray-600 mb-6">{error ?? 'Intenta nuevamente o regresa a mis aulas.'}</p>
          <button
            onClick={onBack}
            className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Volver
          </button>
        </div>
      </div>
    );
  }

  const studentCount = classroom.students?.length ?? 0;
  const activities = (classroom.activities ?? []) as Activity[];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver a Mis Aulas
          </button>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{classroom.name}</h1>
                <p className="text-gray-600 mt-1">{classroom.subject} • {classroom.grade}</p>
              </div>
            </div>

            {isTeacherOwner && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => onEdit?.(classroom.id)}
                  className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Aula
                </button>

                <button
                  onClick={() => onCreateActivity?.(classroom.id)}
                  className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <BookOpen className="w-4 h-4 mr-2" />
                  Crear Actividad
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Estudiantes inscritos</p>
                <p className="text-2xl font-bold text-gray-900">{studentCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Actividades publicadas</p>
                <p className="text-2xl font-bold text-gray-900">{activities.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Docente responsable</p>
                <p className="text-2xl font-bold text-gray-900">{classroom.teacher?.name ?? 'Docente asignado'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">Descripción del Aula</h2>
            <p className="text-gray-600 mt-3 whitespace-pre-line">
              {classroom.description}
            </p>
          </div>

          <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-gray-700">Código de invitación</p>
              <p className="mt-1 font-mono text-lg text-gray-900">{classroom.inviteCode}</p>
              {inviteState.error && (
                <p className="mt-1 text-sm text-red-600">{inviteState.error}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleCopyInviteCode}
                className="inline-flex items-center px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {copyFeedback ? (
                  <ClipboardCopy className="w-4 h-4 mr-2 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copyFeedback ? 'Código copiado' : 'Copiar código'}
              </button>

              {isTeacherOwner && (
                <button
                  onClick={handleRegenerateInvite}
                  className="inline-flex items-center px-4 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 transition-colors"
                  disabled={inviteState.isLoading}
                >
                  {inviteState.isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                      Generando...
                    </>
                  ) : (
                    <>
                      <RefreshCcw className="w-4 h-4 mr-2" />
                      Regenerar código
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Estudiantes</h3>
              <p className="text-gray-600 text-sm mt-1">
                Los estudiantes inscritos verán las actividades asignadas en su panel.
              </p>
            </div>
            <div className="p-6 space-y-3">
              {studentCount === 0 ? (
                <p className="text-gray-500 text-sm">
                  Aún no hay estudiantes inscritos. Comparte el código para invitarlos.
                </p>
              ) : (
                classroom.students.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{student.name}</p>
                      <p className="text-xs text-gray-600">{student.email}</p>
                    </div>
                    <span className="text-xs font-medium text-indigo-600 uppercase">{student.role}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">Actividades del Aula</h3>
              <p className="text-gray-600 text-sm mt-1">
                Gestiona las actividades asignadas a este grupo.
              </p>
            </div>
            <div className="p-6 space-y-3">
              {activities.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  Todavía no hay actividades publicadas para este aula.
                </p>
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-600">
                        {activity.subject} • Dificultad: {activity.difficulty}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-purple-600 uppercase">{activity.type}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {isTeacherOwner && (
          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <MailPlus className="w-5 h-5 text-indigo-600" />
                  Gestión de invitaciones
                </h3>
                <p className="text-gray-600 text-sm mt-1">
                  Envía invitaciones por correo y lleva el seguimiento de los estudiantes pendientes.
                </p>
              </div>
              <div className="text-sm text-gray-500 flex items-center gap-2">
                <Send className="w-4 h-4 text-gray-400" />
                Última actualización: {formatDate(invitations[0]?.updatedAt ?? classroom.updatedAt)}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
              <div>
                <form onSubmit={handleSendInvitations} className="space-y-4">
                  <div>
                    <label htmlFor="emails" className="text-sm font-medium text-gray-700">
                      Correos electrónicos
                    </label>
                    <textarea
                      id="emails"
                      name="emails"
                      value={invitationForm.emails}
                      onChange={handleInvitationFieldChange}
                      rows={4}
                      placeholder="Ingresa uno o varios correos separados por comas o saltos de línea"
                      className="mt-2 w-full rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-gray-700 p-3"
                    />
                  </div>

                  <div>
                    <label htmlFor="message" className="text-sm font-medium text-gray-700">
                      Mensaje opcional
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      value={invitationForm.message}
                      onChange={handleInvitationFieldChange}
                      rows={3}
                      placeholder="Comparte instrucciones adicionales para tus estudiantes"
                      className="mt-2 w-full rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-sm text-gray-700 p-3"
                    />
                  </div>

                  {invitationForm.error && (
                    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {invitationForm.error}
                    </div>
                  )}

                  {invitationForm.feedback && (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                      Se procesaron {processedInvitations} de {invitationForm.feedback.requested} invitaciones.{' '}
                      Se enviaron {deliveredInvitations} invitaciones correctamente.{' '}
                      {skippedInvitations === 0
                        ? 'Todas fueron entregadas.'
                        : `Se omitieron ${skippedInvitations} invitaciones (ver detalles en el listado).`}
                    </div>
                  )}

                  <div className="flex items-center justify-end">
                    <button
                      type="submit"
                      disabled={invitationForm.isSubmitting}
                      className="inline-flex items-center px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
                    >
                      {invitationForm.isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <MailPlus className="w-4 h-4 mr-2" />
                          Enviar invitaciones
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              <div className="space-y-4">
                {invitationActionFeedback && (
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                    {invitationActionFeedback}
                  </div>
                )}

                {invitationListError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {invitationListError}
                  </div>
                )}

                {isLoadingInvitations ? (
                  <div className="flex items-center justify-center py-10 text-gray-500 text-sm">
                    <Loader2 className="w-5 h-5 mr-2 animate-spin text-indigo-600" />
                    Cargando invitaciones...
                  </div>
                ) : invitations.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                    Aún no has enviado invitaciones directas. Usa el formulario para invitar estudiantes.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Correo</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Enviada</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expira</th>
                          <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200 text-sm text-gray-600">
                        {invitations.map((invitation) => {
                          const isResending = resendLoading[invitation.id] ?? false;
                          const isRevoking = revokeLoading[invitation.id] ?? false;
                          const canResend = invitation.status !== 'accepted';
                          const canRevoke = invitation.status === 'pending';

                          return (
                            <tr key={invitation.id}>
                              <td className="px-4 py-3 font-medium text-gray-900">{invitation.email}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${INVITATION_STATUS_STYLES[invitation.status]}`}>
                                  {invitation.status === 'pending' && 'Pendiente'}
                                  {invitation.status === 'accepted' && 'Aceptada'}
                                  {invitation.status === 'revoked' && 'Revocada'}
                                  {invitation.status === 'expired' && 'Expirada'}
                                </span>
                              </td>
                              <td className="px-4 py-3">{formatDate(invitation.sentAt ?? invitation.createdAt)}</td>
                              <td className="px-4 py-3">{formatDate(invitation.expiresAt)}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleResendInvitation(invitation.id)}
                                    disabled={!canResend || isResending}
                                    title={canResend ? 'Reenviar invitación' : 'No disponible para reenviar'}
                                    className="inline-flex items-center justify-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-700 hover:border-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isResending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <RotateCcw className="w-4 h-4" />
                                    )}
                                    <span className="sr-only">Reenviar invitación</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRevokeInvitation(invitation.id)}
                                    disabled={!canRevoke || isRevoking}
                                    title={canRevoke ? 'Revocar invitación' : 'Solo se pueden revocar invitaciones pendientes'}
                                    className="inline-flex items-center justify-center rounded-md border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-red-600 hover:border-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isRevoking ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <Ban className="w-4 h-4" />
                                    )}
                                    <span className="sr-only">Revocar invitación</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClassroomDetail;
