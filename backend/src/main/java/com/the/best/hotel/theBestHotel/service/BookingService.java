package com.the.best.hotel.theBestHotel.service;

import com.the.best.hotel.theBestHotel.exception.ConflictException;
import com.the.best.hotel.theBestHotel.exception.ConflictException.ConflictDetail;
import com.the.best.hotel.theBestHotel.model.Booking;
import com.the.best.hotel.theBestHotel.model.Room;
import com.the.best.hotel.theBestHotel.model.User;
import com.the.best.hotel.theBestHotel.repository.BookingRepository;
import com.the.best.hotel.theBestHotel.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;

    public List<Booking> findAll() {
        return bookingRepository.findAll();
    }

    public List<Booking> findByStatus(Booking.Status status) {
        return bookingRepository.findByStatus(status);
    }

    public Booking findById(ObjectId id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Booking not found"));
    }

    public List<Booking> findByClient(ObjectId clientId) {
        return bookingRepository.findByGuestsClientId(clientId);
    }

    public Booking create(Booking booking, User.Role role, ObjectId clientRefId) {
        if (booking.getRooms() == null || booking.getRooms().isEmpty()) {
            throw new RuntimeException("É necessário informar pelo menos um quarto");
        }

        ObjectId clientId = resolveClientId(booking, role, clientRefId);

        // Room availability + status checks
        double totalAdvance = 0;

        for (Booking.BookedRoom booked : booking.getRooms()) {
            Room room = roomRepository.findById(booked.getRoomId())
                    .orElseThrow(() -> new RuntimeException("Quarto não encontrado"));

            if (room.getStatus() == Room.Status.MAINTENANCE) {
                throw new RuntimeException("O quarto " + room.getNumber() + " está em manutenção");
            }

            booked.setDailyRate(room.getDailyRate());
            if (booked.getNumberOfGuests() < 1) {
                booked.setNumberOfGuests(1);
            }
            totalAdvance += room.getDailyRate();
        }

        // Collect ALL blocking conflicts (client-level CONFIRMED/CHECKIN + room-level CONFIRMED/CHECKIN)
        List<ConflictDetail> blockingConflicts = collectBlockingConflicts(booking, clientId);
        if (!blockingConflicts.isEmpty()) {
            throw new ConflictException("BLOCKING",
                    "Não é possível criar a reserva devido a conflitos com reservas existentes.",
                    blockingConflicts);
        }

        // Collect PENDING conflicts
        List<Booking> pendingConflicts = collectPendingConflicts(booking, clientId);

        // If unconfirmed PENDING conflicts exist, ask user
        if (!pendingConflicts.isEmpty() && booking.getConfirmCancelPending() != Boolean.TRUE) {
            throw new ConflictException("PENDING",
                    "Existem reservas pendentes conflitantes. Deseja cancelá-las para prosseguir?",
                    pendingConflicts.stream().map(this::toConflictDetail).toList());
        }

        // User confirmed — cancel all conflicting PENDING bookings
        for (Booking b : pendingConflicts) {
            freeRooms(b);
            cancelInternal(b, "Cancelada automaticamente devido a conflito com nova reserva");
            String msg = "A reserva pendente do período " + b.getCheckInDate() + " a " +
                    b.getCheckOutDate() + " foi cancelada automaticamente.";
            if (booking.getWarningMessage() == null) {
                booking.setWarningMessage(msg);
            } else {
                booking.setWarningMessage(booking.getWarningMessage() + " " + msg);
            }
        }

        booking.setAdvancePayment(totalAdvance);
        booking.setCreatedAt(LocalDateTime.now());

        if (role == User.Role.CLIENT) {
            if (clientRefId != null) {
                Booking.Guest holder = new Booking.Guest();
                holder.setClientId(clientRefId);
                holder.setHolder(true);
                booking.setGuests(List.of(holder));
            }
            booking.setStatus(Booking.Status.PENDING);
            for (Booking.BookedRoom booked : booking.getRooms()) {
                roomRepository.findById(booked.getRoomId()).ifPresent(room -> {
                    room.setStatus(Room.Status.RESERVED);
                    roomRepository.save(room);
                });
            }
        } else {
            if (booking.getGuests() == null || booking.getGuests().isEmpty()) {
                throw new RuntimeException("É necessário informar o cliente titular da reserva");
            }
            booking.setStatus(Booking.Status.CONFIRMED);
            for (Booking.BookedRoom booked : booking.getRooms()) {
                roomRepository.findById(booked.getRoomId()).ifPresent(room -> {
                    room.setStatus(Room.Status.OCCUPIED);
                    roomRepository.save(room);
                });
            }
        }

        return bookingRepository.save(booking);
    }

    private ObjectId resolveClientId(Booking booking, User.Role role, ObjectId clientRefId) {
        if (role == User.Role.CLIENT && clientRefId != null) {
            return clientRefId;
        }
        if (booking.getGuests() != null && !booking.getGuests().isEmpty()) {
            return booking.getGuests().stream()
                    .filter(Booking.Guest::isHolder)
                    .map(Booking.Guest::getClientId)
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    private List<ConflictDetail> collectBlockingConflicts(Booking booking, ObjectId clientId) {
        List<ConflictDetail> conflicts = new ArrayList<>();

        // Client-level blocking (CONFIRMED/CHECKIN)
        if (clientId != null) {
            List<Booking.Status> blockingStatuses = List.of(
                    Booking.Status.CONFIRMED, Booking.Status.CHECKIN
            );
            List<Booking> clientBlocking = bookingRepository.findByGuestsClientIdAndStatusInAndDateOverlap(
                    clientId, blockingStatuses, booking.getCheckInDate(), booking.getCheckOutDate()
            );
            for (Booking b : clientBlocking) {
                if (!isSelf(booking, b)) {
                    conflicts.add(toConflictDetail(b));
                }
            }
        }

        // Room-level blocking (CONFIRMED/CHECKIN)
        List<Booking.Status> ignoredForBlock = List.of(
                Booking.Status.CANCELLED, Booking.Status.CHECKOUT, Booking.Status.PENDING
        );
        for (Booking.BookedRoom booked : booking.getRooms()) {
            List<Booking> roomBlocking = bookingRepository.findByRoomsRoomIdAndStatusNotIn(
                    booked.getRoomId(), ignoredForBlock
            );
            for (Booking b : roomBlocking) {
                if (isOverlapping(booking, b) && !isSelf(booking, b)) {
                    boolean exists = conflicts.stream()
                            .anyMatch(c -> c.getBookingId().equals(b.getId().toString()));
                    if (!exists) {
                        conflicts.add(toConflictDetail(b));
                    }
                }
            }
        }

        return conflicts;
    }

    private boolean isOverlapping(Booking a, Booking b) {
        return a.getCheckInDate().isBefore(b.getCheckOutDate()) &&
                a.getCheckOutDate().isAfter(b.getCheckInDate());
    }

    private boolean isSelf(Booking a, Booking b) {
        return a.getId() != null && b.getId() != null && a.getId().equals(b.getId());
    }

    private List<Booking> collectPendingConflicts(Booking booking, ObjectId clientId) {
        List<Booking> conflicts = new ArrayList<>();

        if (clientId != null) {
            List<Booking> clientPending = bookingRepository.findByGuestsClientIdAndStatusInAndDateOverlap(
                    clientId, List.of(Booking.Status.PENDING), booking.getCheckInDate(), booking.getCheckOutDate()
            );
            for (Booking b : clientPending) {
                if (!isSelf(booking, b)) {
                    conflicts.add(b);
                }
            }
        }

        for (Booking.BookedRoom booked : booking.getRooms()) {
            List<Booking> roomPending = bookingRepository.findByRoomsRoomIdAndStatusEquals(
                    booked.getRoomId(), Booking.Status.PENDING
            );
            for (Booking b : roomPending) {
                if (isOverlapping(booking, b)) {
                    boolean alreadyAdded = conflicts.stream()
                            .anyMatch(existing -> existing.getId().equals(b.getId()));
                    if (!alreadyAdded) {
                        conflicts.add(b);
                    }
                }
            }
        }

        return conflicts;
    }

    private ConflictDetail toConflictDetail(Booking b) {
        ConflictDetail d = new ConflictDetail();
        d.setBookingId(b.getId().toString());
        d.setCheckInDate(b.getCheckInDate());
        d.setCheckOutDate(b.getCheckOutDate());
        d.setStatus(b.getStatus().toString());
        if (b.getRooms() != null) {
            String roomNums = b.getRooms().stream()
                    .map(r -> roomRepository.findById(r.getRoomId()))
                    .filter(Optional::isPresent)
                    .map(r -> r.get().getNumber())
                    .collect(Collectors.joining(", "));
            d.setRoomNumbers(roomNums);
        }
        return d;
    }

    public Booking approve(ObjectId id, boolean confirmCancelPending) {
        Booking booking = findById(id);

        if (booking.getStatus() != Booking.Status.PENDING) {
            throw new RuntimeException("Only pending bookings can be approved");
        }

        ObjectId clientId = booking.getGuests().stream()
                .filter(Booking.Guest::isHolder)
                .map(Booking.Guest::getClientId)
                .findFirst()
                .orElse(null);

        // Collect blocking conflicts
        List<ConflictDetail> blockingConflicts = collectBlockingConflicts(booking, clientId);
        if (!blockingConflicts.isEmpty()) {
            throw new ConflictException("BLOCKING",
                    "Não é possível aprovar a reserva devido a conflitos com reservas existentes.",
                    blockingConflicts);
        }

        // Collect PENDING conflicts
        List<Booking> pendingConflicts = collectPendingConflicts(booking, clientId);
        pendingConflicts.removeIf(b -> b.getId().equals(booking.getId()));

        // If unconfirmed PENDING conflicts exist, ask user
        if (!pendingConflicts.isEmpty() && !confirmCancelPending) {
            throw new ConflictException("PENDING",
                    "Existem reservas pendentes conflitantes. Deseja cancelá-las para prosseguir?",
                    pendingConflicts.stream().map(this::toConflictDetail).toList());
        }

        // User confirmed — cancel all conflicting PENDING bookings
        for (Booking b : pendingConflicts) {
            freeRooms(b);
            cancelInternal(b, "Cancelada automaticamente - conflito com reserva aprovada");
            String msg = "A reserva pendente do período " + b.getCheckInDate() + " a " +
                    b.getCheckOutDate() + " foi cancelada automaticamente.";
            if (booking.getWarningMessage() == null) {
                booking.setWarningMessage(msg);
            } else {
                booking.setWarningMessage(booking.getWarningMessage() + " " + msg);
            }
        }

        // Per-room check on approve: verify rooms are not in maintenance
        if (booking.getRooms() != null) {
            for (Booking.BookedRoom booked : booking.getRooms()) {
                Room room = roomRepository.findById(booked.getRoomId())
                        .orElseThrow(() -> new RuntimeException("Quarto não encontrado"));
                if (room.getStatus() == Room.Status.MAINTENANCE) {
                    throw new RuntimeException("O quarto " + room.getNumber() + " está em manutenção");
                }
                room.setStatus(Room.Status.OCCUPIED);
                roomRepository.save(room);
            }
        }

        booking.setStatus(Booking.Status.CONFIRMED);
        return bookingRepository.save(booking);
    }

    public Booking cancel(ObjectId id, String reason) {
        Booking booking = findById(id);

        if (booking.getStatus() == Booking.Status.CANCELLED) {
            throw new RuntimeException("Booking already cancelled");
        }
        if (booking.getStatus() == Booking.Status.CHECKOUT) {
            throw new RuntimeException("Cannot cancel a finished stay");
        }
        if (booking.getStatus() == Booking.Status.CHECKIN) {
            throw new RuntimeException("Cannot cancel a booking with active check-in");
        }

        double refund = 0.0;
        if (booking.getCheckInDate() != null) {
            LocalDateTime checkInDateTime = booking.getCheckInDate().atStartOfDay();
            if (LocalDateTime.now().isBefore(checkInDateTime.minusHours(48))) {
                refund = booking.getAdvancePayment();
            }
        }

        cancelInternal(booking, reason);
        booking.getCancellation().setRefundAmount(refund);
        return bookingRepository.save(booking);
    }

    private void cancelInternal(Booking booking, String reason) {
        Booking.Cancellation cancellation = new Booking.Cancellation();
        cancellation.setCancelledAt(LocalDateTime.now());
        cancellation.setReason(reason);
        cancellation.setRefundAmount(0);
        booking.setCancellation(cancellation);
        booking.setStatus(Booking.Status.CANCELLED);
        bookingRepository.save(booking);
    }

    private void freeRooms(Booking booking) {
        if (booking.getRooms() != null) {
            for (Booking.BookedRoom booked : booking.getRooms()) {
                roomRepository.findById(booked.getRoomId()).ifPresent(room -> {
                    room.setStatus(Room.Status.AVAILABLE);
                    roomRepository.save(room);
                });
            }
        }
    }

    public Booking requestCheckin(ObjectId id) {
        Booking booking = findById(id);

        if (booking.getStatus() != Booking.Status.CONFIRMED) {
            throw new RuntimeException("Only confirmed bookings can request check-in");
        }

        booking.setCheckinRequested(true);
        return bookingRepository.save(booking);
    }

    public void delete(ObjectId id) {
        bookingRepository.deleteById(id);
    }
}