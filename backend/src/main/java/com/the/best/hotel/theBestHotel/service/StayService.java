package com.the.best.hotel.theBestHotel.service;

import com.the.best.hotel.theBestHotel.model.Booking;
import com.the.best.hotel.theBestHotel.model.Product;
import com.the.best.hotel.theBestHotel.model.Room;
import com.the.best.hotel.theBestHotel.model.Stay;
import com.the.best.hotel.theBestHotel.model.User;
import com.the.best.hotel.theBestHotel.repository.BookingRepository;
import com.the.best.hotel.theBestHotel.repository.ProductRepository;
import com.the.best.hotel.theBestHotel.repository.RoomRepository;
import com.the.best.hotel.theBestHotel.repository.StayRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StayService {

    private final StayRepository stayRepository;
    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final ProductRepository productRepository;
    private final UserService userService;

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

    public List<Stay> findByClient(ObjectId clientId) {
        return stayRepository.findByClientId(clientId);
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

        if (booking.getRooms() != null) {
            for (Booking.BookedRoom booked : booking.getRooms()) {
                roomRepository.findById(booked.getRoomId()).ifPresent(room -> {
                    room.setStatus(Room.Status.OCCUPIED);
                    roomRepository.save(room);
                });
            }
        }

        ObjectId clientId = null;
        if (booking.getGuests() != null) {
            clientId = booking.getGuests().stream()
                    .filter(Booking.Guest::isHolder)
                    .map(Booking.Guest::getClientId)
                    .findFirst()
                    .orElse(null);
        }

        booking.setStatus(Booking.Status.CHECKIN);
        bookingRepository.save(booking);

        Stay stay = new Stay();
        stay.setBookingId(bookingId);
        stay.setClientId(clientId);
        stay.setCheckInAt(LocalDateTime.now());
        stay.setCheckInEmployeeId(employeeId);
        stay.setConsumptions(new ArrayList<>());
        stay.setStatus(Stay.Status.ACTIVE);

        return stayRepository.save(stay);
    }

    public Stay addConsumption(ObjectId stayId, ObjectId productId, int quantity,
                                Stay.DeliveryStatus deliveryStatus, String notes,
                                Authentication auth) {
        Stay stay = findById(stayId);

        if (stay.getStatus() != Stay.Status.ACTIVE) {
            throw new RuntimeException("Stay is not active");
        }

        verifyClientOwnership(stay, auth);

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Product not found"));

        if (!product.isActive()) {
            throw new RuntimeException("Product is not available");
        }

        Stay.Consumption consumption = new Stay.Consumption();
        consumption.setId(UUID.randomUUID().toString());
        consumption.setProductId(productId);
        consumption.setProductName(product.getName());
        consumption.setQuantity(quantity);
        consumption.setUnitPrice(product.getPrice());
        consumption.setRegisteredAt(LocalDateTime.now());
        consumption.setDeliveryStatus(deliveryStatus);
        consumption.setNotes(notes);

        stay.getConsumptions().add(consumption);

        return stayRepository.save(stay);
    }

    public Stay updateConsumptionStatus(ObjectId stayId, String consumptionId, Stay.DeliveryStatus newStatus, Authentication auth) {
        Stay stay = findById(stayId);

        if (stay.getStatus() != Stay.Status.ACTIVE) {
            throw new RuntimeException("Stay is not active");
        }

        verifyClientOwnership(stay, auth);

        if (stay.getConsumptions() == null) {
            throw new RuntimeException("Consumption not found");
        }

        Stay.Consumption target = stay.getConsumptions().stream()
                .filter(c -> consumptionId.equals(c.getId()))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Consumption not found"));

        boolean isEmployee = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_EMPLOYEE"));

        if (newStatus == Stay.DeliveryStatus.DELIVERED && isEmployee) {
            newStatus = Stay.DeliveryStatus.AWAITING_CONFIRMATION;
        }

        target.setDeliveryStatus(newStatus);
        if (newStatus == Stay.DeliveryStatus.DELIVERED) {
            target.setCompletedAt(LocalDateTime.now());
        }

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

        double sumDailyRates = booking.getRooms() != null
                ? booking.getRooms().stream().mapToDouble(Booking.BookedRoom::getDailyRate).sum()
                : 0;
        double totalDailies = days * sumDailyRates;
        totalDailies = Math.max(0, totalDailies - booking.getAdvancePayment());

        double totalConsumptions = stay.getConsumptions().stream()
                .filter(c -> c.getDeliveryStatus() == Stay.DeliveryStatus.DELIVERED)
                .mapToDouble(c -> c.getUnitPrice() * c.getQuantity())
                .sum();

        stay.setCheckOutAt(checkOutAt);
        stay.setCheckOutEmployeeId(employeeId);
        stay.setTotalDailies(totalDailies);
        stay.setTotalConsumptions(totalConsumptions);
        stay.setGrandTotal(totalDailies + totalConsumptions);
        stay.setStatus(Stay.Status.CLOSED);

        if (booking.getRooms() != null) {
            for (Booking.BookedRoom booked : booking.getRooms()) {
                roomRepository.findById(booked.getRoomId()).ifPresent(room -> {
                    room.setStatus(Room.Status.AVAILABLE);
                    roomRepository.save(room);
                });
            }
        }

        booking.setStatus(Booking.Status.CHECKOUT);
        bookingRepository.save(booking);

        return stayRepository.save(stay);
    }

    private void verifyClientOwnership(Stay stay, Authentication auth) {
        boolean isClient = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_CLIENT"));
        if (!isClient) return;

        User user = userService.findByEmail(auth.getName());
        if (user.getRefId() == null || !user.getRefId().equals(stay.getClientId())) {
            throw new RuntimeException("Stay does not belong to authenticated client");
        }
    }
}