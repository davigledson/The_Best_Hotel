package com.the.best.hotel.theBestHotel.service;

import com.the.best.hotel.theBestHotel.model.User;
import com.the.best.hotel.theBestHotel.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.bson.types.ObjectId;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public List<User> findAll() {
        return userRepository.findAll();
    }

    public User findById(ObjectId id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public User create(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("Email already in use");
        }
        return userRepository.save(user);
    }

    public User update(ObjectId id, User updated) {
        User existing = findById(id);
        existing.setEmail(updated.getEmail());
        existing.setRole(updated.getRole());
        existing.setRefId(updated.getRefId());
        if (updated.getPassword() != null && !updated.getPassword().isBlank()) {
            existing.setPassword(updated.getPassword());
        }
        return userRepository.save(existing);
    }

    public void delete(ObjectId id) {
        userRepository.deleteById(id);
    }
}
