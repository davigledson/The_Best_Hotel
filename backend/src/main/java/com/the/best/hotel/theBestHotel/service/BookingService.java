package com.the.best.hotel.theBestHotel.service;

import com.the.best.hotel.theBestHotel.model.Booking;
import com.the.best.hotel.theBestHotel.model.Room;
import com.the.best.hotel.theBestHotel.model.User;
import com.the.best.hotel.theBestHotel.repository.BookingRepository;
import com.the.best.hotel.theBestHotel.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

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

        double totalAdvance = 0;

        for (Booking.BookedRoom booked : booking.getRooms()) {
            Room room = roomRepository.findById(booked.getRoomId())
                    .orElseThrow(() -> new RuntimeException("Quarto não encontrado"));

            if (room.getStatus() != Room.Status.AVAILABLE) {
                switch (room.getStatus()) {
                    case RESERVED -> throw new RuntimeException("O quarto " + room.getNumber() + " possui uma reserva pendente");
                    case OCCUPIED -> throw new RuntimeException("O quarto " + room.getNumber() + " está ocupado");
                    case MAINTENANCE -> throw new RuntimeException("O quarto " + room.getNumber() + " está em manutenção");
                    default -> throw new RuntimeException("O quarto " + room.getNumber() + " não está disponível");
                }
            }

            List<Booking.Status> ignoredStatuses = List.of(Booking.Status.CANCELLED, Booking.Status.CHECKOUT);
            List<Booking> existing = bookingRepository.findByRoomsRoomIdAndStatusNotIn(booked.getRoomId(), ignoredStatuses);
            for (Booking b : existing) {
                if (booking.getCheckInDate().isBefore(b.getCheckOutDate()) &&
                        booking.getCheckOutDate().isAfter(b.getCheckInDate())) {
                    if (b.getStatus() == Booking.Status.PENDING) {
                        throw new RuntimeException("O quarto " + room.getNumber() + " possui uma reserva pendente");
                    }
                    throw new RuntimeException("O quarto " + room.getNumber() + " já está reservado para este período");
                }
            }

            booked.setDailyRate(room.getDailyRate());
            if (booked.getNumberOfGuests() < 1) {
                booked.setNumberOfGuests(1);
            }
            totalAdvance += room.getDailyRate();
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

    public Booking approve(ObjectId id) {
        Booking booking = findById(id);

        if (booking.getStatus() != Booking.Status.PENDING) {
            throw new RuntimeException("Only pending bookings can be approved");
        }

        if (booking.getRooms() != null) {
            for (Booking.BookedRoom booked : booking.getRooms()) {
                roomRepository.findById(booked.getRoomId()).ifPresent(room -> {
                    room.setStatus(Room.Status.OCCUPIED);
                    roomRepository.save(room);
                });
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

        Booking.Cancellation cancellation = new Booking.Cancellation();
        cancellation.setCancelledAt(LocalDateTime.now());
        cancellation.setReason(reason);
        cancellation.setRefundAmount(refund);

        booking.setCancellation(cancellation);
        booking.setStatus(Booking.Status.CANCELLED);

        if (booking.getRooms() != null) {
            for (Booking.BookedRoom booked : booking.getRooms()) {
                roomRepository.findById(booked.getRoomId()).ifPresent(room -> {
                    room.setStatus(Room.Status.AVAILABLE);
                    roomRepository.save(room);
                });
            }
        }

        return bookingRepository.save(booking);
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