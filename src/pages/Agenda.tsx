import { useState, useEffect } from 'react';
import { Plus, Trash2, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import Card from '../components/Card';
import Button from '../components/Button';
import Modal from '../components/Modal';
import Input from '../components/Input';
import Select from '../components/Select';
import Badge from '../components/Badge';
import { useAuth } from '../contexts/AuthContext';
import { useAircraft } from '../contexts/AircraftContext';
import { storage } from '../services/storage';
import { Booking, User } from '../types';
import { formatDate, formatDateTime } from '../utils/format';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, isSameMonth, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import './Agenda.css';

export default function Agenda() {
  const { user } = useAuth();
  const { selectedAircraft } = useAircraft();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<Partial<Booking>>({});

  useEffect(() => {
    if (selectedAircraft) {
      loadBookings();
    }
    setUsers(storage.getUsers());
  }, [selectedAircraft]);

  const loadBookings = () => {
    if (!selectedAircraft) return;
    setBookings(storage.getBookings(selectedAircraft.id).filter(b => !b.cancelado));
  };

  const handleSave = () => {
    if (!user || !selectedAircraft || !editingBooking.dataInicio || !editingBooking.dataFim) return;

    try {
      const booking = {
        ...editingBooking,
        aircraftId: selectedAircraft.id,
        memberId: editingBooking.memberId || user.id,
        confirmado: true,
        cancelado: false,
        notificacaoEnviada: false,
      } as Booking;

      storage.saveBooking(booking, user.id, user.nome);
      loadBookings();
      setModalOpen(false);
      setEditingBooking({});
    } catch (error) {
      alert('Conflito de agendamento detectado!');
    }
  };

  const handleCancel = (booking: Booking) => {
    if (!user) return;
    if (confirm('Tem certeza que deseja cancelar este agendamento?')) {
      const updated = { ...booking, cancelado: true, motivoCancelamento: 'Cancelado pelo usuário' };
      storage.saveBooking(updated, user.id, user.nome);
      loadBookings();
    }
  };

  const renderCalendarHeader = () => {
    return (
      <div className="calendar-header">
        <button className="nav-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, -1))}>
          <ChevronLeft size={20} />
        </button>
        <h2>{format(currentMonth, 'MMMM yyyy', { locale: ptBR })}</h2>
        <button className="nav-btn" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
          <ChevronRight size={20} />
        </button>
      </div>
    );
  };

  const renderCalendarDays = () => {
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    return (
      <div className="calendar-days">
        {days.map((day) => (
          <div key={day} className="day-name">{day}</div>
        ))}
      </div>
    );
  };

  const renderCalendarCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const currentDay = day;
        const dayBookings = bookings.filter((b) => {
          const bookingStart = parseISO(b.dataInicio);
          const bookingEnd = parseISO(b.dataFim);
          return currentDay >= bookingStart && currentDay <= bookingEnd;
        });

        days.push(
          <div
            key={day.toString()}
            className={`calendar-cell ${!isSameMonth(day, monthStart) ? 'disabled' : ''} ${isSameDay(day, new Date()) ? 'today' : ''} ${selectedDate && isSameDay(day, selectedDate) ? 'selected' : ''}`}
            onClick={() => {
              setSelectedDate(currentDay);
              if (isSameMonth(currentDay, monthStart)) {
                setEditingBooking({
                  dataInicio: format(currentDay, "yyyy-MM-dd'T'09:00"),
                  dataFim: format(currentDay, "yyyy-MM-dd'T'17:00"),
                });
              }
            }}
          >
            <span className="day-number">{format(day, 'd')}</span>
            {dayBookings.length > 0 && (
              <div className="day-bookings">
                {dayBookings.slice(0, 2).map((b) => {
                  const member = users.find((u) => u.id === b.memberId);
                  return (
                    <div key={b.id} className="booking-dot" title={member?.nome || 'Reservado'}>
                      {member?.nome.charAt(0)}
                    </div>
                  );
                })}
                {dayBookings.length > 2 && (
                  <span className="more-bookings">+{dayBookings.length - 2}</span>
                )}
              </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(
        <div key={day.toString()} className="calendar-row">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="calendar-body">{rows}</div>;
  };

  const selectedDateBookings = selectedDate
    ? bookings.filter((b) => {
        const bookingStart = parseISO(b.dataInicio);
        const bookingEnd = parseISO(b.dataFim);
        return selectedDate >= bookingStart && selectedDate <= bookingEnd;
      })
    : [];

  if (!selectedAircraft) {
    return (
      <div className="empty-state">
        <Calendar size={64} className="empty-state-icon" />
        <h3>Selecione uma aeronave</h3>
        <p>Selecione uma aeronave no menu lateral para gerenciar a agenda.</p>
      </div>
    );
  }

  return (
    <div className="agenda-page">
      <div className="page-header">
        <div>
          <h1>Agenda</h1>
          <p className="page-subtitle">Agendamentos - {selectedAircraft.prefixo}</p>
        </div>
        <Button
          icon={<Plus size={18} />}
          onClick={() => {
            const now = new Date();
            setEditingBooking({
              dataInicio: format(now, "yyyy-MM-dd'T'09:00"),
              dataFim: format(now, "yyyy-MM-dd'T'17:00"),
            });
            setModalOpen(true);
          }}
        >
          Novo Agendamento
        </Button>
      </div>

      <div className="agenda-grid">
        <Card className="calendar-card">
          {renderCalendarHeader()}
          {renderCalendarDays()}
          {renderCalendarCells()}
        </Card>

        <Card title={selectedDate ? `Agendamentos - ${formatDate(selectedDate)}` : 'Próximos Agendamentos'}>
          <div className="bookings-list">
            {(selectedDate ? selectedDateBookings : bookings.slice(0, 10)).map((booking) => {
              const member = users.find((u) => u.id === booking.memberId);
              return (
                <div key={booking.id} className="booking-item">
                  <div className="booking-info">
                    <div className="booking-member">
                      <div className="member-avatar">{member?.nome.charAt(0)}</div>
                      <div>
                        <span className="member-name">{member?.nome}</span>
                        <span className="booking-dates">
                          {formatDateTime(booking.dataInicio)} - {formatDateTime(booking.dataFim)}
                        </span>
                      </div>
                    </div>
                    {booking.finalidade && (
                      <p className="booking-purpose">{booking.finalidade}</p>
                    )}
                  </div>
                  <div className="booking-actions">
                    <Badge variant={booking.confirmado ? 'success' : 'warning'}>
                      {booking.confirmado ? 'Confirmado' : 'Pendente'}
                    </Badge>
                    <button className="action-btn danger" onClick={() => handleCancel(booking)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
            {(selectedDate ? selectedDateBookings : bookings).length === 0 && (
              <div className="empty-bookings">
                <p>Nenhum agendamento</p>
              </div>
            )}
          </div>

          {selectedDate && (
            <Button
              variant="outline"
              className="new-booking-btn"
              onClick={() => setModalOpen(true)}
            >
              Agendar para {formatDate(selectedDate)}
            </Button>
          )}
        </Card>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Novo Agendamento"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </>
        }
      >
        <div className="form-grid">
          <Select
            label="Membro"
            options={users.map((u) => ({ value: u.id, label: u.nome }))}
            value={editingBooking.memberId || user?.id || ''}
            onChange={(e) => setEditingBooking({ ...editingBooking, memberId: e.target.value })}
          />
          <Input
            label="Finalidade"
            value={editingBooking.finalidade || ''}
            onChange={(e) => setEditingBooking({ ...editingBooking, finalidade: e.target.value })}
            placeholder="Ex: Voo de instrução"
          />
          <Input
            label="Data/Hora Início"
            type="datetime-local"
            value={editingBooking.dataInicio || ''}
            onChange={(e) => setEditingBooking({ ...editingBooking, dataInicio: e.target.value })}
            required
          />
          <Input
            label="Data/Hora Fim"
            type="datetime-local"
            value={editingBooking.dataFim || ''}
            onChange={(e) => setEditingBooking({ ...editingBooking, dataFim: e.target.value })}
            required
          />
        </div>
        <div style={{ marginTop: '1rem' }}>
          <Input
            label="Observações"
            value={editingBooking.observacoes || ''}
            onChange={(e) => setEditingBooking({ ...editingBooking, observacoes: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
}
