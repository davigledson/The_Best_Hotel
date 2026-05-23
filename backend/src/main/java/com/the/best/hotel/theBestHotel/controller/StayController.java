package com.the.best.hotel.theBestHotel.controller;

import com.the.best.hotel.theBestHotel.model.Stay;
import com.the.best.hotel.theBestHotel.model.User;
import com.the.best.hotel.theBestHotel.service.StayService;
import com.the.best.hotel.theBestHotel.service.UserService;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/stays")
@RequiredArgsConstructor
public class StayController {

    private final StayService stayService;
    private final UserService userService;

    @GetMapping
    public ResponseEntity<List<Stay>> findAll() {
        return ResponseEntity.ok(stayService.findAll());
    }

    @GetMapping("/my")
    public ResponseEntity<List<Stay>> findMyStays(Authentication auth) {
        User user = userService.findByEmail(auth.getName());
        if (user.getRefId() == null) {
            return ResponseEntity.ok(List.of());
        }
        return ResponseEntity.ok(stayService.findByClient(user.getRefId()));
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<Stay>> findByStatus(@PathVariable Stay.Status status) {
        return ResponseEntity.ok(stayService.findByStatus(status));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Stay> findById(@PathVariable String id) {
        return ResponseEntity.ok(stayService.findById(new ObjectId(id)));
    }

    @PostMapping("/checkin")
    public ResponseEntity<Stay> checkIn(@RequestBody Map<String, String> body, Authentication auth) {
        ObjectId bookingId = new ObjectId(body.get("bookingId"));
        ObjectId employeeId = resolveEmployeeId(body.get("employeeId"), auth);
        return ResponseEntity.status(HttpStatus.CREATED).body(stayService.checkIn(bookingId, employeeId));
    }

    @PostMapping("/{id}/consumptions")
    public ResponseEntity<Stay> addConsumption(@PathVariable String id, @RequestBody Map<String, String> body) {
        ObjectId productId = new ObjectId(body.get("productId"));
        int quantity = Integer.parseInt(body.get("quantity"));
        Stay.DeliveryStatus status = body.containsKey("deliveryStatus")
                ? Stay.DeliveryStatus.valueOf(body.get("deliveryStatus"))
                : Stay.DeliveryStatus.FOR_DELIVERY;
        String notes = body.getOrDefault("notes", null);
        return ResponseEntity.ok(stayService.addConsumption(new ObjectId(id), productId, quantity, status, notes));
    }

    @PutMapping("/{stayId}/consumptions/{consumptionId}")
    public ResponseEntity<Stay> updateConsumptionStatus(
            @PathVariable String stayId,
            @PathVariable String consumptionId,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        Stay.DeliveryStatus newStatus = Stay.DeliveryStatus.valueOf(body.get("deliveryStatus"));
        return ResponseEntity.ok(stayService.updateConsumptionStatus(new ObjectId(stayId), consumptionId, newStatus, auth));
    }

    @PostMapping("/{id}/checkout")
    public ResponseEntity<Stay> checkOut(@PathVariable String id, @RequestBody Map<String, String> body, Authentication auth) {
        ObjectId employeeId = resolveEmployeeId(body.get("employeeId"), auth);
        return ResponseEntity.ok(stayService.checkOut(new ObjectId(id), employeeId));
    }

    private ObjectId resolveEmployeeId(String providedEmployeeId, Authentication auth) {
        User user = userService.findByEmail(auth.getName());
        if (user.getRole() == User.Role.ADMIN && providedEmployeeId != null && !providedEmployeeId.isBlank()) {
            return new ObjectId(providedEmployeeId);
        }
        if (user.getRefId() == null) {
            throw new RuntimeException("Authenticated user has no linked employee record");
        }
        return user.getRefId();
    }
}