package com.the.best.hotel.theBestHotel.service;

import com.the.best.hotel.theBestHotel.model.Booking;
import com.the.best.hotel.theBestHotel.model.Product;
import com.the.best.hotel.theBestHotel.model.Room;
import com.the.best.hotel.theBestHotel.model.Stay;
import com.the.best.hotel.theBestHotel.repository.BookingRepository;
import com.the.best.hotel.theBestHotel.repository.ProductRepository;
import com.the.best.hotel.theBestHotel.repository.RoomRepository;
import com.the.best.hotel.theBestHotel.repository.StayRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StayService {

    private final StayRepository stayRepository;
    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final ProductRepository productRepository;

    public List<Stay> findAll() {
        return stayRepository.findAll();
    }

    public List<Stay> findByStatus(Stay.Status status) {
        return stayRepository.findByStatus(status);
    }

    public Stay findById(ObjectId id) {
        return stayRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Stay not found"));
    }

    public Stay checkIn(ObjectId bookingId, ObjectId employeeId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        if (booking.getStatus() != Booking.Status.CONFIRMED) {
            throw new RuntimeException("Booking is not confirmed");
        }

        stayRepository.findByBookingId(bookingId).ifPresent(s -> {
            throw new RuntimeException("Check-in already done for this booking");
        });

        Room room = roomRepository.findById(booking.getRoomId())
                .orElseThrow(() -> new RuntimeException("Room not found"));

        room.setStatus(Room.Status.OCCUPIED);
        roomRepository.save(room);

        booking.setStatus(Booking.Status.CHECKIN);
        bookingRepository.save(booking);

        Stay stay = new Stay();
        stay.setBookingId(bookingId);
        stay.setCheckInAt(LocalDateTime.now());
        stay.setCheckInEmployeeId(employeeId);
        stay.setConsumptions(new ArrayList<>());
        stay.setStatus(Stay.Status.ACTIVE);

        return stayRepository.save(stay);
    }

    public Stay addConsumption(ObjectId stayId, ObjectId productId, int quantity) {
        Stay stay = findById(stayId);

        if (stay.getStatus() != Stay.Status.ACTIVE) {
            throw new RuntimeException("Stay is not active");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!product.isActive()) {
            throw new RuntimeException("Product is not available");
        }

        Stay.Consumption consumption = new Stay.Consumption();
        consumption.setProductId(productId);
        consumption.setProductName(product.getName());
        consumption.setQuantity(quantity);
        consumption.setUnitPrice(product.getPrice());
        consumption.setRegisteredAt(LocalDateTime.now());

        stay.getConsumptions().add(consumption);

        return stayRepository.save(stay);
    }

    public Stay checkOut(ObjectId stayId, ObjectId employeeId) {
        Stay stay = findById(stayId);

        if (stay.getStatus() != Stay.Status.ACTIVE) {
            throw new RuntimeException("Stay is not active");
        }

        Booking booking = bookingRepository.findById(stay.getBookingId())
                .orElseThrow(() -> new RuntimeException("Booking not found"));

        LocalDateTime checkOutAt = LocalDateTime.now();
        long days = ChronoUnit.DAYS.between(stay.getCheckInAt(), checkOutAt);
        if (days == 0) days = 1;

        double totalDailies = days * booking.getDailyRate();
        // desconta a diária já paga no ato da reserva
        totalDailies = Math.max(0, totalDailies - booking.getAdvancePayment());

        double totalConsumptions = stay.getConsumptions().stream()
                .mapToDouble(c -> c.getUnitPrice() * c.getQuantity())
                .sum();

        stay.setCheckOutAt(checkOutAt);
        stay.setCheckOutEmployeeId(employeeId);
        stay.setTotalDailies(totalDailies);
        stay.setTotalConsumptions(totalConsumptions);
        stay.setGrandTotal(totalDailies + totalConsumptions);
        stay.setStatus(Stay.Status.CLOSED);

        Room room = roomRepository.findById(booking.getRoomId())
                .orElseThrow(() -> new RuntimeException("Room not found"));
        room.setStatus(Room.Status.AVAILABLE);
        roomRepository.save(room);

        booking.setStatus(Booking.Status.CHECKOUT);
        bookingRepository.save(booking);

        return stayRepository.save(stay);
    }
}