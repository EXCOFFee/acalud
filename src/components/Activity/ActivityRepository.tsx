import { useEffect, useMemo, useState } from 'react';
import { httpClient, HttpError } from '../../services/http.service';

interface ActivitySummary {
  id: string;
  title: string;
  description: string;
  type: string;
  difficulty: string;
  createdAt: string;
  classroom?: {
    id: string;
    name: string;
  };
}

interface ActivityRepositoryProps {
  onNavigate: (page: string, data?: Record<string, unknown>) => void;
  onBack: () => void;
}

const LOADING_PLACEHOLDERS = Array.from({ length: 6 }).map((_, index) => index);

export function ActivityRepository({ onNavigate, onBack }: ActivityRepositoryProps) {
  const [activities, setActivities] = useState<ActivitySummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const fetchActivities = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await httpClient.get<ActivitySummary[] | { data?: ActivitySummary[]; meta?: Record<string, unknown> }>(
          '/activities?page=1&limit=20&isActive=true'
        );

        if (isCancelled) {
          return;
        }

        let parsedActivities: ActivitySummary[] = [];

        if (Array.isArray(response)) {
          parsedActivities = response;
        } else if (response?.data && Array.isArray(response.data)) {
          parsedActivities = response.data;
        }

        setActivities(parsedActivities);
      } catch (error) {
        if (isCancelled) {
          return;
        }

        if (error instanceof HttpError) {
          setErrorMessage(error.message || 'No fue posible cargar el repositorio');
        } else {
          setErrorMessage('Se produjo un error inesperado al cargar el repositorio');
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    fetchActivities();

    return () => {
      isCancelled = true;
    };
  }, []);

  const parsedActivities = useMemo(() => activities, [activities]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Repositorio de Actividades</h1>
          <p className="text-gray-600 mt-1">
            Explora actividades públicas creadas por la comunidad docente y reutilízalas en tus aulas.
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Volver al Dashboard
        </button>
      </div>

      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {LOADING_PLACEHOLDERS.map((placeholder) => (
            <div
              key={placeholder}
              className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-4 h-6 w-2/3 rounded bg-gray-200" />
              <div className="mb-2 h-4 w-full rounded bg-gray-100" />
              <div className="mb-2 h-4 w-11/12 rounded bg-gray-100" />
              <div className="h-4 w-1/3 rounded bg-gray-100" />
            </div>
          ))}
        </div>
      )}

      {!isLoading && errorMessage && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-6 text-red-700">
          <h2 className="text-lg font-semibold">No pudimos cargar el repositorio</h2>
          <p className="mt-2 text-sm">{errorMessage}</p>
          <button
            onClick={onBack}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm hover:bg-red-100"
          >
            Regresar
          </button>
        </div>
      )}

      {!isLoading && !errorMessage && parsedActivities.length === 0 && (
        <div className="rounded-xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900">Aún no hay actividades públicas</h2>
          <p className="mt-2 text-gray-600">
            Publica tus mejores actividades desde la sección de gestión para que otros docentes puedan reutilizarlas.
          </p>
        </div>
      )}

      {!isLoading && !errorMessage && parsedActivities.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {parsedActivities.map((activity) => (
            <article key={activity.id} className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{activity.title}</h2>
                <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold uppercase text-indigo-700">
                  {activity.type}
                </span>
              </div>

              <p className="mt-3 line-clamp-3 text-sm text-gray-600">{activity.description}</p>

              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                <span className="rounded-full bg-gray-100 px-2 py-1 font-medium">Dificultad: {activity.difficulty}</span>
                {activity.classroom?.name && (
                  <span className="rounded-full bg-gray-100 px-2 py-1 font-medium">
                    Aula original: {activity.classroom.name}
                  </span>
                )}
                <span className="rounded-full bg-gray-100 px-2 py-1 font-medium">
                  Creada el {new Date(activity.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => onNavigate('activity-detail', {
                    activityId: activity.id,
                    classroomId: activity.classroom?.id,
                  })}
                  className="text-sm font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Ver detalles
                </button>
                <button
                  onClick={() => onNavigate('create-activity', {
                    classroomId: activity.classroom?.id,
                    templateActivityId: activity.id,
                  })}
                  className="rounded-lg border border-indigo-200 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-50"
                >
                  Usar como plantilla
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
