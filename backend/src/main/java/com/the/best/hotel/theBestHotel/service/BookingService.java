package com.the.best.hotel.theBestHotel.service;

import com.the.best.hotel.theBestHotel.model.Booking;
import com.the.best.hotel.theBestHotel.model.Room;
import com.the.best.hotel.theBestHotel.repository.BookingRepository;
import com.the.best.hotel.theBestHotel.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
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

    public Booking create(Booking booking) {
        Room room = roomRepository.findById(booking.getRoomId())
                .orElseThrow(() -> new RuntimeException("Room not found"));

        if (room.getStatus() != Room.Status.AVAILABLE) {
            throw new RuntimeException("Room is not available");
        }

        // verifica conflito de datas com reservas ativas
        List<Booking.Status> ignoredStatuses = List.of(Booking.Status.CANCELLED, Booking.Status.CHECKOUT);
        List<Booking> existing = bookingRepository.findByRoomIdAndStatusNotIn(booking.getRoomId(), ignoredStatuses);
        for (Booking b : existing) {
            if (booking.getCheckInDate().isBefore(b.getCheckOutDate()) &&
                    booking.getCheckOutDate().isAfter(b.getCheckInDate())) {
                throw new RuntimeException("Room already booked for this period");
            }
        }

        booking.setDailyRate(room.getDailyRate());
        booking.setAdvancePayment(room.getDailyRate());
        booking.setStatus(Booking.Status.CONFIRMED);
        booking.setCreatedAt(LocalDateTime.now());

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

        // regra de estorno: até 48h antes do check-in -> estorno total, senão sem estorno
        double refund = 0.0;
        LocalDateTime checkInDateTime = booking.getCheckInDate().atStartOfDay();
        if (LocalDateTime.now().isBefore(checkInDateTime.minusHours(48))) {
            refund = booking.getAdvancePayment();
        }

        Booking.Cancellation cancellation = new Booking.Cancellation();
        cancellation.setCancelledAt(LocalDateTime.now());
        cancellation.setReason(reason);
        cancellation.setRefundAmount(refund);

        booking.setCancellation(cancellation);
        booking.setStatus(Booking.Status.CANCELLED);

        return bookingRepository.save(booking);
    }

    public void delete(ObjectId id) {
        bookingRepository.deleteById(id);
    }
}